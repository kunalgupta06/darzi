import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Order status lifecycle — the frontend timeline maps 1:1 to this.
const STATUS_FLOW = [
  "PLACED", "PICKUP_SCHEDULED", "PICKED_UP", "STITCHING", "QUALITY_CHECK", "OUT_FOR_DELIVERY", "DELIVERED",
];

const FABRIC_ADDON = 500, EXPRESS_FEE = 99, PICKUP_FEE = 29, PLATFORM_FEE = 15;

// helper: parse the JSON-string columns back into real values for the client
const hydrateTailor = (t) => ({
  ...t,
  specialties: JSON.parse(t.specialties || "[]"),
  gradient: JSON.parse(t.gradient || "[]"),
});

const ah = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
});

/* ── health ─────────────────────────────────────────────────────────────── */
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "darzi" }));

/* ── auth (lite, phone-based stub — swap for real OTP later) ─────────────── */
app.post("/api/login", ah(async (req, res) => {
  const { name = "Guest", phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required" });
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { name, phone },
  });
  res.json({ user, token: "demo-token-" + user.id }); // replace with a signed JWT
}));

/* ── catalogue ──────────────────────────────────────────────────────────── */
app.get("/api/categories", (_req, res) => {
  res.json([
    { key: "stitch", label: "Stitching" }, { key: "alter", label: "Alteration" },
    { key: "bridal", label: "Bridal & Lehenga" }, { key: "blouse", label: "Blouse" },
    { key: "suit", label: "Suits & Blazers" }, { key: "kurta", label: "Kurta & Ethnic" },
    { key: "home", label: "Home Furnishing" }, { key: "express", label: "Express" },
  ]);
});

// GET /api/tailors?category=blouse&q=reema
app.get("/api/tailors", ah(async (req, res) => {
  const { category, q } = req.query;
  let tailors = await prisma.tailor.findMany({
    include: { services: true },
    orderBy: { rating: "desc" },
  });
  if (category === "express") tailors = tailors.filter((t) => t.express);
  else if (category) tailors = tailors.filter((t) => t.services.some((s) => s.category === category));
  if (q) tailors = tailors.filter((t) => t.name.toLowerCase().includes(String(q).toLowerCase()));
  res.json(tailors.map(hydrateTailor));
}));

app.get("/api/tailors/:id", ah(async (req, res) => {
  const t = await prisma.tailor.findUnique({
    where: { id: req.params.id },
    include: { services: true, reviews: { orderBy: { createdAt: "desc" } } },
  });
  if (!t) return res.status(404).json({ error: "Tailor not found" });
  res.json(hydrateTailor(t));
}));

/* ── measurements ───────────────────────────────────────────────────────── */
app.get("/api/users/:userId/measurements", ah(async (req, res) => {
  const profiles = await prisma.measurementProfile.findMany({
    where: { userId: req.params.userId },
    include: { measurements: true },
  });
  res.json(profiles);
}));

app.post("/api/users/:userId/measurements", ah(async (req, res) => {
  const { label, values = {} } = req.body; // values: { Chest: 38, Waist: 32, ... }
  const profile = await prisma.measurementProfile.create({
    data: {
      userId: req.params.userId,
      label,
      measurements: { create: Object.entries(values).filter(([, v]) => v != null && v !== "")
        .map(([key, v]) => ({ key, valueIn: Number(v) })) },
    },
    include: { measurements: true },
  });
  res.status(201).json(profile);
}));

app.put("/api/measurements/:profileId", ah(async (req, res) => {
  const { label, values = {} } = req.body;
  await prisma.measurement.deleteMany({ where: { profileId: req.params.profileId } });
  const profile = await prisma.measurementProfile.update({
    where: { id: req.params.profileId },
    data: {
      label,
      measurements: { create: Object.entries(values).filter(([, v]) => v != null && v !== "")
        .map(([key, v]) => ({ key, valueIn: Number(v) })) },
    },
    include: { measurements: true },
  });
  res.json(profile);
}));

/* ── orders ─────────────────────────────────────────────────────────────── */
// body: { userId, tailorId, addressId?, pickupSlot, paymentMethod,
//         items: [{ serviceId, profileId?, fabricOption, express, qty }] }
app.post("/api/orders", ah(async (req, res) => {
  const { userId, tailorId, addressId, pickupSlot, paymentMethod, items = [] } = req.body;
  if (!items.length) return res.status(400).json({ error: "Order must contain at least one item" });

  // price on the server — never trust client totals
  const services = await prisma.service.findMany({
    where: { id: { in: items.map((i) => i.serviceId) } },
  });
  const priceOf = (id) => services.find((s) => s.id === id)?.basePrice ?? 0;

  let subtotal = 0, express = 0;
  const lineItems = items.map((i) => {
    const unitPrice = priceOf(i.serviceId) + (i.fabricOption === "tailor" ? FABRIC_ADDON : 0);
    subtotal += unitPrice * i.qty;
    if (i.express) express += EXPRESS_FEE * i.qty;
    return {
      serviceId: i.serviceId, profileId: i.profileId ?? null,
      fabricOption: i.fabricOption ?? "self", express: !!i.express, qty: i.qty ?? 1, unitPrice,
    };
  });
  const gst = Math.round(subtotal * 0.05);
  const fees = PICKUP_FEE + PLATFORM_FEE + express;
  const total = subtotal + fees + gst;

  const order = await prisma.order.create({
    data: {
      userId, tailorId, addressId: addressId ?? null, pickupSlot, paymentMethod,
      status: "PICKUP_SCHEDULED", subtotal, fees, gst, total,
      paymentStatus: paymentMethod === "COD" ? "PENDING" : "PAID",
      items: { create: lineItems },
    },
    include: { items: { include: { service: true } }, tailor: true },
  });
  res.status(201).json(order);
}));

app.get("/api/orders", ah(async (req, res) => {
  const { userId } = req.query;
  const orders = await prisma.order.findMany({
    where: userId ? { userId } : {},
    include: { items: { include: { service: true } }, tailor: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}));

app.get("/api/orders/:id", ah(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { service: true, profile: true } }, tailor: true, address: true },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ ...order, statusIndex: STATUS_FLOW.indexOf(order.status) });
}));

// advance / set status — used by tailor app + the "simulate next step" demo button
app.patch("/api/orders/:id/status", ah(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  let next = req.body.status;
  if (!next) {
    const i = STATUS_FLOW.indexOf(order.status);
    next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
  }
  if (!STATUS_FLOW.includes(next)) return res.status(400).json({ error: "Invalid status" });
  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: next } });
  res.json({ ...updated, statusIndex: STATUS_FLOW.indexOf(updated.status) });
}));

/* ── reviews ────────────────────────────────────────────────────────────── */
app.post("/api/tailors/:id/reviews", ah(async (req, res) => {
  const { userId, rating, comment } = req.body;
  const review = await prisma.review.create({
    data: { tailorId: req.params.id, userId, rating, comment },
  });
  // keep the tailor's aggregate rating in sync
  const agg = await prisma.review.aggregate({
    where: { tailorId: req.params.id }, _avg: { rating: true }, _count: true,
  });
  await prisma.tailor.update({
    where: { id: req.params.id },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
  res.status(201).json(review);
}));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🧵 Darzi API running on http://localhost:${PORT}`));