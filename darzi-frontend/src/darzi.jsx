import React, { useState, useEffect, useRef } from "react";
import {
  Search, MapPin, Star, ChevronLeft, ChevronRight, ChevronDown, Plus, Minus,
  Check, Clock, Phone, ShoppingBag, Package, User, X, Zap, Scissors, Ruler,
  Shirt, Crown, Sparkles, Sofa, Home, Truck, CheckCircle2, Circle, Pencil,
  Trash2, ArrowRight, BadgeCheck, ChevronUp
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   DARZI — on-demand tailoring marketplace (prototype)

   This file is fully self-contained: the "backend" lives in the `api` object
   below as in-memory data + functions. That object is the SINGLE integration
   point — swap each method's body for a fetch() call to the Express server
   (see darzi-backend) and the UI keeps working unchanged. `api.placeOrder` is
   already written async (Promise + delay) to model the real client/server gap.
   ────────────────────────────────────────────────────────────────────────── */

const C = {
  magenta: "#C2185B", magentaDeep: "#9E1350", ink: "#3D1A2B", marigold: "#F4A300",
  teal: "#0E7C7B", bg: "#FBF6F0", surface: "#FFFFFF", tint: "#FBE7F0",
  tint2: "#FCEFD6", tealTint: "#E2F1F0", muted: "#7A5C68", border: "#EBD9E2",
  line: "#F3E9EE",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.darzi *{box-sizing:border-box;margin:0;padding:0}
.darzi{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.darzi .serif{font-family:'Fraunces',Georgia,serif}
.darzi button{font-family:inherit}
.darzi .scroll{scrollbar-width:none}
.darzi .scroll::-webkit-scrollbar{width:0;height:0}
.darzi :focus-visible{outline:2px solid ${C.magenta};outline-offset:2px}
.darzi .tap{transition:transform .12s ease, box-shadow .15s ease}
.darzi .tap:active{transform:scale(.97)}
.darzi .phone{width:100%;max-width:430px;height:100dvh;border-radius:0}
@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pop{0%{transform:translate(-50%,8px);opacity:0}100%{transform:translate(-50%,0);opacity:1}}
@media (min-width:520px){
  .darzi .phone{height:880px;max-height:92vh;border-radius:36px;
    box-shadow:0 40px 80px -20px rgba(61,26,43,.45);border:1px solid ${C.border}}
}
@media (prefers-reduced-motion: reduce){.darzi *{animation:none!important;transition:none!important}}
`;

/* ── data (the "database") ────────────────────────────────────────────────── */
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const uid = () => Math.random().toString(36).slice(2, 9);

const CATS = [
  { key: "stitch", label: "Stitching", sub: "Made to measure", icon: Scissors, g: ["#C2185B", "#E0457B"] },
  { key: "alter", label: "Alteration", sub: "Fix the fit", icon: Ruler, g: ["#0E7C7B", "#34A8A2"] },
  { key: "bridal", label: "Bridal & Lehenga", sub: "Big day, perfect fit", icon: Crown, g: ["#9E1350", "#C2185B"] },
  { key: "blouse", label: "Blouse", sub: "Designer & basic", icon: Shirt, g: ["#E0457B", "#F4A300"] },
  { key: "suit", label: "Suits & Blazers", sub: "Sharp tailoring", icon: BadgeCheck, g: ["#3D1A2B", "#7A5C68"] },
  { key: "kurta", label: "Kurta & Ethnic", sub: "Everyday ethnic", icon: Sparkles, g: ["#F4A300", "#E0457B"] },
  { key: "home", label: "Home Furnishing", sub: "Curtains & more", icon: Sofa, g: ["#0E7C7B", "#3D1A2B"] },
  { key: "express", label: "Express", sub: "Ready in 24–48h", icon: Zap, g: ["#F4A300", "#C2185B"] },
];

const svc = (category, name, price, etaDays, desc) => ({ id: uid(), category, name, price, etaDays, desc });

const TAILORS = [
  {
    id: "t1", name: "Sharma Tailors", area: "Krishna Nagar", distanceKm: 0.8,
    rating: 4.7, ratingCount: 1240, express: true, g: ["#C2185B", "#E0457B"],
    tags: ["Men's wear", "Suits", "Kurta"],
    about: "Three generations of tailoring in Krishna Nagar. Specialists in formal menswear and ethnic stitching, known for crisp finishing and on-time delivery.",
    services: [
      svc("stitch", "Formal shirt stitching", 700, 6, "Full sleeve, machine + hand finish"),
      svc("stitch", "Trouser stitching", 800, 6, "Pleated or flat-front"),
      svc("alter", "Trouser alteration", 150, 2, "Length, waist or taper"),
      svc("suit", "2-piece suit / blazer", 3200, 10, "Canvassed front, custom lining"),
      svc("kurta", "Kurta-pajama set", 950, 7, "Cotton, silk or linen"),
    ],
    reviews: [
      { n: "Rohit M.", r: 5, t: "Suit fit was spot on, picked up and delivered on time." },
      { n: "Aman S.", r: 4, t: "Good stitching, slightly delayed by a day." },
    ],
  },
  {
    id: "t2", name: "Reema's Stitch Studio", area: "Laxmi Nagar", distanceKm: 1.6,
    rating: 4.8, ratingCount: 860, express: true, g: ["#E0457B", "#F4A300"],
    tags: ["Blouses", "Salwar suits", "Gowns"],
    about: "Women's boutique tailoring with an eye for fit. Blouses, suits and custom dresses, with doorstep measurement on request.",
    services: [
      svc("blouse", "Blouse stitching (lined)", 450, 4, "Princess-cut, padded option"),
      svc("alter", "Saree fall & pico", 120, 2, "Machine pico + fall stitch"),
      svc("kurta", "Salwar suit set", 1200, 7, "Top, bottom & dupatta finish"),
      svc("stitch", "Custom dress / gown", 2800, 9, "From your design or reference"),
      svc("alter", "Blouse alteration", 180, 3, "Resize, dart, hook adjust"),
    ],
    reviews: [
      { n: "Priya K.", r: 5, t: "Blouse fitting was perfect, loved the finishing." },
      { n: "Neha R.", r: 5, t: "She copied my reference dress exactly. Highly recommend." },
    ],
  },
  {
    id: "t3", name: "Gandhi Nagar Silai Co.", area: "Gandhi Nagar", distanceKm: 2.4,
    rating: 4.5, ratingCount: 2100, express: false, g: ["#0E7C7B", "#34A8A2"],
    tags: ["Volume", "Home furnishing", "Basics"],
    about: "High-volume stitching unit in Asia's largest garment hub. Great value on basics and home furnishing, dependable for bulk.",
    services: [
      svc("stitch", "Shirt stitching", 600, 6, "Everyday cotton shirts"),
      svc("kurta", "Cotton kurta", 650, 5, "Simple, breathable cut"),
      svc("home", "Curtain stitching (per panel)", 250, 3, "Eyelet or pleated header"),
      svc("home", "Bedsheet edging", 150, 2, "Hem & corner finish"),
      svc("stitch", "Trouser stitching", 750, 6, "Cotton or formal"),
    ],
    reviews: [
      { n: "Vikas T.", r: 4, t: "Cheap and reliable for bulk shirts." },
      { n: "Sunita D.", r: 5, t: "Got 6 curtains done, neat work." },
    ],
  },
  {
    id: "t4", name: "Royal Darzi House", area: "Preet Vihar", distanceKm: 3.1,
    rating: 4.6, ratingCount: 540, express: true, g: ["#9E1350", "#C2185B"],
    tags: ["Bridal", "Sherwani", "Premium"],
    about: "Premium bridal and occasion wear. Hand-finished lehengas and sherwanis with multiple fittings included.",
    services: [
      svc("bridal", "Custom lehenga", 5500, 14, "3 fittings, hand finishing"),
      svc("bridal", "Sherwani", 6500, 16, "Embroidered, lined, with churidar"),
      svc("suit", "3-piece suit", 4200, 12, "Premium fabric tailoring"),
      svc("blouse", "Heavy-work blouse", 1200, 8, "Embellished, padded"),
    ],
    reviews: [
      { n: "Ishita G.", r: 5, t: "My wedding lehenga fit beautifully. Worth it." },
      { n: "Karan B.", r: 4, t: "Sherwani was excellent, premium pricing though." },
    ],
  },
  {
    id: "t5", name: "Anita Blouse & Ethnic", area: "Vivek Vihar", distanceKm: 2.9,
    rating: 4.9, ratingCount: 430, express: false, g: ["#F4A300", "#E0457B"],
    tags: ["Designer blouse", "Saree", "Ethnic"],
    about: "Boutique known for designer blouses and pre-stitched sarees. Detail-obsessed with the highest ratings on Darzi.",
    services: [
      svc("blouse", "Designer blouse", 950, 6, "Backless, knots, piping"),
      svc("stitch", "Saree pre-stitch", 1500, 7, "Ready-to-wear conversion"),
      svc("bridal", "Lehenga blouse", 1800, 9, "Bridal-grade finishing"),
      svc("kurta", "Anarkali suit", 1300, 8, "Flared, lined, custom"),
    ],
    reviews: [
      { n: "Megha S.", r: 5, t: "Best blouse fitting I've ever had. Period." },
      { n: "Tara N.", r: 5, t: "Pre-stitched saree was a lifesaver for the function." },
    ],
  },
  {
    id: "t6", name: "QuickFit Alterations", area: "Mayur Vihar", distanceKm: 3.6,
    rating: 4.4, ratingCount: 1500, express: true, g: ["#34A8A2", "#0E7C7B"],
    tags: ["Same-day", "Alterations", "Repairs"],
    about: "Express alteration specialists. Most jobs back in 24 hours with doorstep pickup and drop.",
    services: [
      svc("alter", "Pant alteration", 150, 1, "Length / waist same day"),
      svc("alter", "Shirt alteration", 140, 1, "Slim-fit, sleeve, length"),
      svc("alter", "Jeans hemming", 120, 1, "Original hem retained"),
      svc("alter", "Suit alteration", 400, 2, "Jacket & trouser"),
      svc("alter", "Zip replacement", 180, 1, "Jacket, jeans, bags"),
    ],
    reviews: [
      { n: "Deepak J.", r: 4, t: "Got my pants altered same day. Fast." },
      { n: "Ritu A.", r: 5, t: "Saved my outfit hours before an event." },
    ],
  },
];

const MEASURE_FIELDS = ["Chest / Bust", "Waist", "Hips", "Shoulder", "Sleeve length", "Garment length", "Neck"];
const PICKUP_SLOTS = ["Today, 4–6 PM", "Today, 6–8 PM", "Tomorrow, 10 AM–12 PM", "Tomorrow, 4–6 PM"];
const STATUS_STEPS = ["Order placed", "Pickup scheduled", "Picked up", "Stitching in progress", "Quality check", "Out for delivery", "Delivered"];

const FABRIC_ADDON = 500, EXPRESS_FEE = 99, PICKUP_FEE = 29, PLATFORM_FEE = 15;

/* ── the api: replace each body with fetch() to go live ─────────────────────── */
const api = {
  getCategories: () => CATS,
  getTailors: (cat) => {
    if (!cat) return [...TAILORS].sort((a, b) => b.rating - a.rating);
    if (cat === "express") return TAILORS.filter((t) => t.express);
    return TAILORS.filter((t) => t.services.some((s) => s.category === cat));
  },
  getTailor: (id) => TAILORS.find((t) => t.id === id),
  // demonstrates the real async client/server boundary
  placeOrder: (order) =>
    new Promise((res) => setTimeout(() => res({ ...order, id: "OD" + Date.now().toString().slice(-7), statusIndex: 1 }), 1100)),
};

/* ── shared UI bits ─────────────────────────────────────────────────────────── */
function Avatar({ g, label, size = 56, icon: Icon, radius = 16 }) {
  const init = label.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flex: "0 0 auto",
      background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, display: "grid", placeItems: "center",
      color: "#fff", position: "relative", overflow: "hidden" }}>
      {Icon ? <Icon size={size * 0.4} /> : <span style={{ fontWeight: 800, fontSize: size * 0.3 }}>{init}</span>}
      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.08)", mixBlendMode: "overlay" }} />
    </div>
  );
}

function Rating({ r, count }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.tint2,
      color: C.ink, padding: "3px 8px", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
      <Star size={12} fill={C.marigold} stroke="none" /> {r}
      {count != null && <span style={{ color: C.muted, fontWeight: 600 }}>({count})</span>}
    </span>
  );
}

function Btn({ children, onClick, disabled, kind = "solid", style }) {
  const base = { width: "100%", border: "none", borderRadius: 14, padding: "14px 16px",
    fontWeight: 700, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.55 : 1 };
  const kinds = {
    solid: { background: C.magenta, color: "#fff", boxShadow: "0 8px 20px -6px rgba(194,24,91,.5)" },
    ghost: { background: C.tint, color: C.magenta },
    dark: { background: C.ink, color: "#fff" },
  };
  return <button className="tap" onClick={onClick} disabled={disabled} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

function Chip({ active, children, onClick }) {
  return (
    <button className="tap" onClick={onClick} style={{ border: `1.5px solid ${active ? C.magenta : C.border}`,
      background: active ? C.tint : C.surface, color: active ? C.magenta : C.muted, borderRadius: 999,
      padding: "9px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function Stepper({ value, set }) {
  const btn = { width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${C.border}`,
    background: C.surface, color: C.magenta, fontWeight: 800, cursor: "pointer", display: "grid", placeItems: "center" };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <button className="tap" style={btn} onClick={() => set(Math.max(1, value - 1))}><Minus size={15} /></button>
      <b style={{ minWidth: 16, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{value}</b>
      <button className="tap" style={btn} onClick={() => set(value + 1)}><Plus size={15} /></button>
    </div>
  );
}

function Tape({ color = C.ink }) {
  const ticks = Array.from({ length: 41 });
  return (
    <svg viewBox="0 0 410 24" width="100%" height="22" preserveAspectRatio="none" style={{ display: "block" }}>
      <line x1="0" y1="1.5" x2="410" y2="1.5" stroke={color} strokeWidth="1.5" opacity="0.45" />
      {ticks.map((_, i) => {
        const x = i * 10 + 3, major = i % 5 === 0;
        return <line key={i} x1={x} y1="1.5" x2={x} y2={major ? 12 : 7} stroke={color} strokeWidth={major ? 1.5 : 1} opacity={major ? 0.7 : 0.35} />;
      })}
      {ticks.map((_, i) => i % 5 === 0 && i > 0 ? <text key={"x" + i} x={i * 10 + 5} y="21" fontSize="6.5" fill={color} opacity="0.5" fontFamily="monospace">{i}</text> : null)}
    </svg>
  );
}

function Card({ children, onClick, style }) {
  return (
    <div className={onClick ? "tap" : ""} onClick={onClick} style={{ background: C.surface, borderRadius: 18,
      border: `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

function TailorCard({ t, onClick }) {
  const from = Math.min(...t.services.map((s) => s.price));
  return (
    <Card onClick={onClick} style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
      <Avatar g={t.g} label={t.name} size={62} radius={16} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <b style={{ fontSize: 15.5 }}>{t.name}</b>
          {t.express && <Zap size={13} fill={C.marigold} stroke="none" />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "5px 0 6px" }}>
          <Rating r={t.rating} count={t.ratingCount} />
          <span style={{ color: C.muted, fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <MapPin size={11} /> {t.distanceKm} km · {t.area}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {t.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: 11, color: C.muted, background: C.line, padding: "3px 8px", borderRadius: 7 }}>{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right", flex: "0 0 auto" }}>
        <div style={{ fontSize: 11, color: C.muted }}>from</div>
        <b style={{ color: C.magenta, fontSize: 15 }}>{inr(from)}</b>
        <ChevronRight size={18} color={C.muted} style={{ display: "block", marginLeft: "auto", marginTop: 4 }} />
      </div>
    </Card>
  );
}

/* ── app ────────────────────────────────────────────────────────────────────── */
const ROOTS = ["home", "explore", "orders", "profile"];

export default function App() {
  const [stack, setStack] = useState([{ s: "home" }]);
  const [cart, setCart] = useState([]);
  const [profiles, setProfiles] = useState([
    { id: "p1", label: "Mine", values: { "Chest / Bust": "38", "Waist": "32", "Hips": "40", "Shoulder": "17", "Sleeve length": "24", "Garment length": "40", "Neck": "15.5" } },
  ]);
  const [orders, setOrders] = useState(() => {
    const t = TAILORS[1];
    return [{
      id: "OD7741203", tailorId: t.id, tailorName: t.name, statusIndex: 3,
      items: [{ id: uid(), tailorId: t.id, tailorName: t.name, service: t.services[0], profileLabel: "Mine", fabric: "self", express: false, qty: 1, unitPrice: t.services[0].price }],
      slot: "Tomorrow, 10 AM–12 PM", total: 472, payment: "UPI", createdAt: Date.now() - 86400000 * 2,
    }];
  });
  const [sheet, setSheet] = useState(null);     // {type:'customize'|'measure', ...}
  const [toast, setToast] = useState(null);
  const [slot, setSlot] = useState(PICKUP_SLOTS[2]);
  const [payment, setPayment] = useState("UPI");
  const [placing, setPlacing] = useState(false);
  const mainRef = useRef(null);

  const cur = stack[stack.length - 1];
  const isRoot = ROOTS.includes(cur.s);

  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [stack]);

  const nav = (s, params = {}) => setStack((st) => [...st, { s, ...params }]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const goRoot = (s) => setStack([{ s }]);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1900); };

  const billOf = (items) => {
    const subtotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
    const express = items.reduce((a, i) => a + (i.express ? i.qty * EXPRESS_FEE : 0), 0);
    const gst = subtotal ? Math.round(subtotal * 0.05) : 0;
    const pickup = items.length ? PICKUP_FEE : 0;
    const platform = items.length ? PLATFORM_FEE : 0;
    return { subtotal, express, gst, pickup, platform, total: subtotal + express + gst + pickup + platform };
  };

  const addToCart = (item) => { setCart((c) => [...c, item]); setSheet(null); flash("Added to cart"); };
  const removeItem = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const placeOrder = async () => {
    setPlacing(true);
    const order = await api.placeOrder({
      tailorId: cart[0].tailorId, tailorName: cart[0].tailorName, items: cart,
      slot, total: billOf(cart).total, payment, createdAt: Date.now(),
    });
    setOrders((o) => [order, ...o]);
    setCart([]);
    setPlacing(false);
    setStack([{ s: "orders" }, { s: "tracking", orderId: order.id }]);
    flash("Order placed!");
  };

  /* ── header ── */
  const titles = { explore: "Explore services", orders: "Your orders", profile: "Profile", measurements: "Saved measurements",
    cart: "Your pickup", checkout: "Checkout", tailorList: cur.catLabel || "Tailors near you", tailor: "", tracking: "Track order" };

  const Header = () => {
    if (cur.s === "home") {
      return (
        <div style={{ padding: "14px 16px 12px", background: C.surface, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div onClick={() => flash("Location picker — demo")} className="tap" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Pickup at</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 15.5 }}>
                <MapPin size={15} color={C.magenta} /> Krishna Nagar, Delhi <ChevronDown size={15} color={C.muted} />
              </div>
            </div>
            <Avatar g={[C.ink, C.muted]} label="Kunal" size={38} radius={12} />
          </div>
          <div onClick={() => goRoot("explore")} className="tap" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10,
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 13, padding: "11px 13px", cursor: "pointer", color: C.muted }}>
            <Search size={17} color={C.magenta} /> <span style={{ fontSize: 14 }}>Search “blouse stitching”, “alteration”…</span>
          </div>
        </div>
      );
    }
    if (cur.s === "tailor") return null; // tailor screen has its own cover header
    const showSearch = cur.s === "explore";
    return (
      <div style={{ padding: "14px 14px 12px", background: C.surface, borderBottom: `1px solid ${C.line}`,
        display: "flex", alignItems: "center", gap: 10 }}>
        {!isRoot && (
          <button className="tap" onClick={back} aria-label="Back" style={{ width: 38, height: 38, borderRadius: 11,
            border: `1px solid ${C.border}`, background: C.surface, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <ChevronLeft size={20} color={C.ink} />
          </button>
        )}
        <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{titles[cur.s]}</div>
        {showSearch && <Search size={20} color={C.muted} style={{ marginLeft: "auto" }} />}
      </div>
    );
  };

  /* ── screens ── */
  const renderHome = () => {
    const top = api.getTailors();
    return (
      <div style={{ paddingBottom: 24 }}>
        {/* hero */}
        <div style={{ margin: "16px 16px 0", borderRadius: 22, overflow: "hidden",
          background: `linear-gradient(135deg, ${C.magenta}, ${C.magentaDeep})`, color: "#fff", position: "relative" }}>
          <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(244,163,0,.25)" }} />
          <div style={{ padding: "20px 18px 14px", position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.18)",
              padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>
              <Scissors size={12} /> Doorstep pickup & delivery
            </div>
            <div className="serif" style={{ fontSize: 27, lineHeight: 1.12, fontWeight: 600 }}>Your darzi,<br />at your doorstep.</div>
            <p style={{ fontSize: 13, opacity: 0.9, margin: "8px 0 14px", maxWidth: 260 }}>
              Stitching, alterations & bridal work from trusted tailors near you.
            </p>
            <button className="tap" onClick={() => goRoot("explore")} style={{ background: "#fff", color: C.magenta, border: "none",
              borderRadius: 12, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Book a pickup <ArrowRight size={16} />
            </button>
          </div>
          <div style={{ padding: "0 0 4px" }}><Tape color="#fff" /></div>
        </div>

        {/* categories */}
        <SectionHead title="What do you need?" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, padding: "0 16px" }}>
          {CATS.map((c) => (
            <button key={c.key} className="tap" onClick={() => nav("tailorList", { catKey: c.key, catLabel: c.label })}
              style={{ border: "none", background: "transparent", cursor: "pointer", textAlign: "center", padding: 0 }}>
              <div style={{ aspectRatio: "1", borderRadius: 16, background: `linear-gradient(135deg,${c.g[0]},${c.g[1]})`,
                display: "grid", placeItems: "center", color: "#fff", marginBottom: 6 }}>
                <c.icon size={22} />
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>{c.label}</div>
            </button>
          ))}
        </div>

        {/* express strip */}
        <div onClick={() => nav("tailorList", { catKey: "express", catLabel: "Express" })} className="tap"
          style={{ margin: "20px 16px 0", borderRadius: 16, padding: "14px 16px", cursor: "pointer",
            background: C.tint2, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.marigold}33` }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.marigold, display: "grid", placeItems: "center", color: "#fff" }}>
            <Zap size={22} fill="#fff" stroke="none" />
          </div>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14.5 }}>Express alterations</b>
            <div style={{ fontSize: 12.5, color: C.muted }}>Ready in 24–48 hours · same-day pickup</div>
          </div>
          <ChevronRight size={20} color={C.muted} />
        </div>

        {/* top tailors */}
        <SectionHead title="Top darzis near you" action="See all" onAction={() => goRoot("explore")} />
        <div style={{ display: "grid", gap: 12, padding: "0 16px" }}>
          {top.slice(0, 4).map((t) => <TailorCard key={t.id} t={t} onClick={() => nav("tailor", { tailorId: t.id })} />)}
        </div>
      </div>
    );
  };

  const renderExplore = () => (
    <div style={{ padding: "14px 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 13, padding: "12px 13px", marginBottom: 18 }}>
        <Search size={18} color={C.magenta} />
        <input placeholder="Search services or tailors" style={{ border: "none", outline: "none", flex: 1, fontSize: 14,
          fontFamily: "inherit", background: "transparent", color: C.ink }} onFocus={() => flash("Search — demo")} />
      </div>
      <div className="serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>Browse by category</div>
      <div style={{ display: "grid", gap: 11 }}>
        {CATS.map((c) => (
          <Card key={c.key} onClick={() => nav("tailorList", { catKey: c.key, catLabel: c.label })}
            style={{ padding: 12, display: "flex", alignItems: "center", gap: 13 }}>
            <Avatar g={c.g} label={c.label} size={50} radius={13} icon={c.icon} />
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 15 }}>{c.label}</b>
              <div style={{ fontSize: 12.5, color: C.muted }}>{c.sub}</div>
            </div>
            <ChevronRight size={19} color={C.muted} />
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTailorList = () => {
    const list = api.getTailors(cur.catKey);
    return (
      <div style={{ padding: "14px 16px 24px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }} className="scroll">
          <Chip active>Nearest</Chip><Chip>Top rated</Chip><Chip>Express</Chip><Chip>Price: low to high</Chip>
        </div>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
            <Scissors size={34} color={C.border} />
            <p style={{ marginTop: 12, fontSize: 14 }}>No tailors here yet. Try another category.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {list.map((t) => <TailorCard key={t.id} t={t} onClick={() => nav("tailor", { tailorId: t.id })} />)}
          </div>
        )}
      </div>
    );
  };

  const renderTailor = () => {
    const t = api.getTailor(cur.tailorId);
    const groups = {};
    t.services.forEach((s) => { (groups[s.category] ||= []).push(s); });
    const catLabel = (k) => CATS.find((c) => c.key === k)?.label || k;
    return (
      <div>
        {/* cover */}
        <div style={{ position: "relative", height: 150, background: `linear-gradient(135deg,${t.g[0]},${t.g[1]})` }}>
          <button className="tap" onClick={back} aria-label="Back" style={{ position: "absolute", top: 14, left: 14, width: 38, height: 38,
            borderRadius: 11, border: "none", background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <ChevronLeft size={20} color={C.ink} />
          </button>
          {t.express && (
            <div style={{ position: "absolute", top: 16, right: 14, background: C.marigold, color: "#fff", fontSize: 11.5,
              fontWeight: 800, padding: "5px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} fill="#fff" stroke="none" /> Express
            </div>
          )}
        </div>
        <div style={{ padding: "0 16px", marginTop: -28 }}>
          <Card style={{ padding: 16 }}>
            <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>{t.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 10px" }}>
              <Rating r={t.rating} count={t.ratingCount} />
              <span style={{ color: C.muted, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} /> {t.distanceKm} km · {t.area}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>{t.about}</p>
          </Card>
        </div>

        {/* service menu */}
        <SectionHead title="Services" />
        <div style={{ padding: "0 16px" }}>
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.magenta, textTransform: "uppercase",
                letterSpacing: ".05em", marginBottom: 8 }}>{catLabel(cat)}</div>
              <Card style={{ overflow: "hidden" }}>
                {items.map((s, i) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14,
                    borderTop: i ? `1px solid ${C.line}` : "none" }}>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 14.5 }}>{s.name}</b>
                      <div style={{ fontSize: 12.5, color: C.muted, margin: "3px 0 5px" }}>{s.desc}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5 }}>
                        <b style={{ color: C.ink }}>{inr(s.price)}</b>
                        <span style={{ color: C.teal, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                          <Clock size={12} /> {s.etaDays} day{s.etaDays > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button className="tap" onClick={() => setSheet({ type: "customize", tailor: t, service: s })}
                      style={{ border: `1.5px solid ${C.magenta}`, background: C.tint, color: C.magenta, fontWeight: 800,
                        fontSize: 13, padding: "8px 16px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Plus size={15} /> Add
                    </button>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>

        {/* reviews */}
        <SectionHead title="What customers say" />
        <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
          {t.reviews.map((rv, i) => (
            <Card key={i} style={{ padding: 13 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <b style={{ fontSize: 13.5 }}>{rv.n}</b>
                <span style={{ display: "inline-flex", gap: 1 }}>
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} size={12} fill={k < rv.r ? C.marigold : C.border} stroke="none" />
                  ))}
                </span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.45 }}>{rv.t}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderMeasurements = () => (
    <div style={{ padding: "14px 16px 24px" }}>
      <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Save measurement profiles once and attach them to any order. Add one per person.
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        {profiles.map((p) => {
          const filled = Object.entries(p.values).filter(([, v]) => v);
          return (
            <Card key={p.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: C.tint, display: "grid", placeItems: "center" }}>
                    <Ruler size={17} color={C.magenta} />
                  </div>
                  <b style={{ fontSize: 15 }}>{p.label}</b>
                </div>
                <button className="tap" onClick={() => setSheet({ type: "measure", editing: p })} style={{ border: "none", background: C.line,
                  borderRadius: 9, padding: "7px 9px", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <Pencil size={15} color={C.muted} />
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {filled.map(([k, v]) => (
                  <span key={k} style={{ fontSize: 11.5, color: C.muted, background: C.bg, border: `1px solid ${C.border}`,
                    padding: "4px 9px", borderRadius: 8 }}>{k.split(" ")[0]} <b style={{ color: C.ink }}>{v}"</b></span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <Btn kind="ghost" onClick={() => setSheet({ type: "measure", editing: null })}><Plus size={17} /> Add measurement profile</Btn>
      </div>
    </div>
  );

  const renderCart = () => {
    const bill = billOf(cart);
    if (cart.length === 0)
      return (
        <div style={{ textAlign: "center", padding: "80px 24px", color: C.muted }}>
          <ShoppingBag size={40} color={C.border} />
          <div className="serif" style={{ fontSize: 19, color: C.ink, margin: "14px 0 6px" }}>Your pickup is empty</div>
          <p style={{ fontSize: 13.5 }}>Add a stitching or alteration service to get started.</p>
          <div style={{ marginTop: 18, maxWidth: 220, marginInline: "auto" }}>
            <Btn onClick={() => goRoot("explore")}>Browse services</Btn>
          </div>
        </div>
      );
    return (
      <div style={{ padding: "14px 16px 24px" }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>From <b style={{ color: C.ink }}>{cart[0].tailorName}</b></div>
        <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          {cart.map((i) => (
            <Card key={i.id} style={{ padding: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14.5 }}>{i.service.name}</b>
                  <div style={{ fontSize: 12, color: C.muted, margin: "4px 0 8px" }}>
                    {i.profileLabel} · {i.fabric === "tailor" ? "Tailor sources fabric" : "You provide fabric"}
                    {i.express && <span style={{ color: C.marigold, fontWeight: 700 }}> · Express</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Stepper value={i.qty} set={(q) => setCart((c) => c.map((x) => x.id === i.id ? { ...x, qty: q } : x))} />
                    <button className="tap" onClick={() => removeItem(i.id)} style={{ border: "none", background: "transparent",
                      color: C.muted, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
                <b style={{ color: C.ink, fontSize: 14.5 }}>{inr(i.qty * i.unitPrice)}</b>
              </div>
            </Card>
          ))}
        </div>

        <div className="serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Pickup slot</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {PICKUP_SLOTS.map((s) => <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>{s}</Chip>)}
        </div>

        <Card style={{ padding: 14, display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
          <MapPin size={19} color={C.magenta} />
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 13.5 }}>Home</b>
            <div style={{ fontSize: 12.5, color: C.muted }}>B-42, Krishna Nagar, Delhi 110051</div>
          </div>
          <button className="tap" onClick={() => flash("Address editor — demo")} style={{ border: "none", background: "transparent",
            color: C.magenta, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Change</button>
        </Card>

        <BillBlock bill={bill} />
      </div>
    );
  };

  const renderCheckout = () => {
    const bill = billOf(cart);
    const methods = [{ k: "UPI", d: "Pay by any UPI app" }, { k: "Card", d: "Credit / debit card" }, { k: "Cash on pickup", d: "Pay the tailor at pickup" }];
    return (
      <div style={{ padding: "14px 16px 24px" }}>
        <div className="serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Payment method</div>
        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          {methods.map((m) => (
            <Card key={m.k} onClick={() => setPayment(m.k)} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12,
              border: `1.5px solid ${payment === m.k ? C.magenta : C.border}` }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${payment === m.k ? C.magenta : C.border}`,
                display: "grid", placeItems: "center" }}>
                {payment === m.k && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.magenta }} />}
              </div>
              <div style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{m.k}</b><div style={{ fontSize: 12.5, color: C.muted }}>{m.d}</div></div>
            </Card>
          ))}
        </div>
        <BillBlock bill={bill} />
      </div>
    );
  };

  const renderTracking = () => {
    const o = orders.find((x) => x.id === cur.orderId);
    if (!o) return null;
    const maxEta = Math.max(...o.items.map((i) => i.service.etaDays));
    const eta = new Date(o.createdAt + maxEta * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    return (
      <div style={{ padding: "14px 16px 24px" }}>
        <Card style={{ padding: 16, marginBottom: 16, background: `linear-gradient(135deg,${C.tint},${C.surface})` }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Order {o.id}</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 10px" }}>{o.tailorName}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tealTint, color: C.teal,
            padding: "6px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
            <Truck size={15} /> Est. delivery {eta}
          </div>
        </Card>

        {/* timeline */}
        <Card style={{ padding: "18px 16px", marginBottom: 16 }}>
          {STATUS_STEPS.map((step, i) => {
            const done = i < o.statusIndex, here = i === o.statusIndex;
            return (
              <div key={step} style={{ display: "flex", gap: 13 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {done ? <CheckCircle2 size={22} color={C.teal} fill={C.tealTint} />
                    : here ? <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.magenta, display: "grid", placeItems: "center", boxShadow: `0 0 0 4px ${C.tint}` }}><Circle size={8} fill="#fff" stroke="none" /></div>
                    : <Circle size={22} color={C.border} />}
                  {i < STATUS_STEPS.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 26, background: done ? C.teal : C.line, margin: "2px 0" }} />}
                </div>
                <div style={{ paddingBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: here ? 800 : done ? 600 : 500, color: here ? C.magenta : done ? C.ink : C.muted }}>{step}</div>
                  {here && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>In progress…</div>}
                </div>
              </div>
            );
          })}
        </Card>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Btn kind="ghost" onClick={() => flash("Calling tailor — demo")}><Phone size={16} /> Call tailor</Btn>
          {o.statusIndex < STATUS_STEPS.length - 1 && (
            <Btn kind="dark" onClick={() => setOrders((os) => os.map((x) => x.id === o.id ? { ...x, statusIndex: x.statusIndex + 1 } : x))}>
              Simulate next step
            </Btn>
          )}
        </div>

        <div className="serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Items</div>
        <div style={{ display: "grid", gap: 8 }}>
          {o.items.map((i) => (
            <Card key={i.id} style={{ padding: 12, display: "flex", justifyContent: "space-between" }}>
              <div><b style={{ fontSize: 13.5 }}>{i.service.name}</b><div style={{ fontSize: 12, color: C.muted }}>Qty {i.qty} · {i.profileLabel}</div></div>
              <b style={{ fontSize: 13.5 }}>{inr(i.qty * i.unitPrice)}</b>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderOrders = () => (
    <div style={{ padding: "14px 16px 24px" }}>
      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 24px", color: C.muted }}>
          <Package size={38} color={C.border} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No orders yet. Your stitching jobs will show up here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => {
            const delivered = o.statusIndex >= STATUS_STEPS.length - 1;
            return (
              <Card key={o.id} onClick={() => nav("tracking", { orderId: o.id })} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <b style={{ fontSize: 15 }}>{o.tailorName}</b>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 9px", borderRadius: 8,
                    background: delivered ? C.tealTint : C.tint, color: delivered ? C.teal : C.magenta }}>
                    {delivered ? "Delivered" : STATUS_STEPS[o.statusIndex]}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>
                  {o.id} · {o.items.length} item{o.items.length > 1 ? "s" : ""} · {inr(o.total)}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, color: C.ink }}>{o.items.map((i) => i.service.name).join(", ")}</span>
                  <ChevronRight size={18} color={C.muted} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderProfile = () => {
    const rows = [
      { icon: Ruler, label: "Saved measurements", sub: `${profiles.length} profile${profiles.length > 1 ? "s" : ""}`, go: () => nav("measurements") },
      { icon: MapPin, label: "Addresses", sub: "Home · Krishna Nagar", go: () => flash("Addresses — demo") },
      { icon: Package, label: "Your orders", sub: `${orders.length} total`, go: () => goRoot("orders") },
      { icon: Phone, label: "Help & support", sub: "Chat or call us", go: () => flash("Support — demo") },
    ];
    return (
      <div style={{ padding: "14px 16px 24px" }}>
        <Card style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Avatar g={[C.magenta, C.magentaDeep]} label="Kunal Singh" size={56} radius={16} />
          <div><b style={{ fontSize: 17 }}>Kunal Singh</b><div style={{ fontSize: 13, color: C.muted }}>+91 98765 43210</div></div>
        </Card>
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <Card key={r.label} onClick={r.go} style={{ padding: 14, display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: C.tint, display: "grid", placeItems: "center" }}>
                <r.icon size={18} color={C.magenta} />
              </div>
              <div style={{ flex: 1 }}><b style={{ fontSize: 14.5 }}>{r.label}</b><div style={{ fontSize: 12.5, color: C.muted }}>{r.sub}</div></div>
              <ChevronRight size={19} color={C.muted} />
            </Card>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 22 }}>Darzi · prototype build</p>
      </div>
    );
  };

  const screens = { home: renderHome, explore: renderExplore, tailorList: renderTailorList, tailor: renderTailor,
    measurements: renderMeasurements, cart: renderCart, checkout: renderCheckout, tracking: renderTracking,
    orders: renderOrders, profile: renderProfile };

  /* footer CTA per screen */
  const footer = (() => {
    if (cur.s === "cart" && cart.length) {
      const b = billOf(cart);
      return <Btn onClick={() => nav("checkout")}>Proceed to checkout · {inr(b.total)} <ChevronRight size={18} /></Btn>;
    }
    if (cur.s === "checkout") {
      const b = billOf(cart);
      return <Btn onClick={placeOrder} disabled={placing}>{placing ? <Spinner /> : <>Place order · {inr(b.total)}</>}</Btn>;
    }
    return null;
  })();

  return (
    <div className="darzi" style={{ minHeight: "100dvh", background: C.bg, display: "grid", placeItems: "center", padding: 0 }}>
      <style>{CSS}</style>
      <div className="phone" style={{ background: C.surface, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Header />
        <main ref={mainRef} className="scroll" style={{ flex: 1, overflowY: "auto", background: cur.s === "tailor" ? C.surface : C.bg }}>
          {screens[cur.s]()}
        </main>

        {footer && (
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.line}`, background: C.surface, flex: "0 0 auto" }}>{footer}</div>
        )}

        {isRoot && <BottomNav cur={cur.s} goRoot={goRoot} cartCount={cart.length} onCart={() => nav("cart")} />}

        {/* cart shortcut FAB on tailor screen */}
        {cur.s === "tailor" && cart.length > 0 && (
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>
            <Btn onClick={() => nav("cart")}>
              <ShoppingBag size={17} /> {cart.length} item{cart.length > 1 ? "s" : ""} · view pickup
            </Btn>
          </div>
        )}

        {sheet?.type === "customize" && (
          <CustomizeSheet sheet={sheet} profiles={profiles} onClose={() => setSheet(null)}
            onAddProfile={() => setSheet({ type: "measure", editing: null, returnTo: sheet })} onAdd={addToCart} />
        )}
        {sheet?.type === "measure" && (
          <MeasureSheet editing={sheet.editing} onClose={() => setSheet(sheet.returnTo || null)}
            onSave={(p) => {
              setProfiles((ps) => sheet.editing ? ps.map((x) => x.id === p.id ? p : x) : [...ps, p]);
              setSheet(sheet.returnTo || null);
              flash(sheet.editing ? "Profile updated" : "Profile saved");
            }} />
        )}

        {toast && (
          <div style={{ position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)", background: C.ink,
            color: "#fff", padding: "11px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, animation: "pop .2s ease",
            display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
            <Check size={15} color={C.marigold} /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── sub-components ─────────────────────────────────────────────────────────── */
function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 16px 12px" }}>
      <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: C.ink }}>{title}</div>
      {action && <button onClick={onAction} className="tap" style={{ border: "none", background: "transparent", color: C.magenta,
        fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{action}</button>}
    </div>
  );
}

function BillBlock({ bill }) {
  const row = (label, val, strong) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0",
      color: strong ? C.ink : C.muted, fontWeight: strong ? 800 : 500 }}>
      <span>{label}</span><span style={{ color: strong ? C.ink : C.ink }}>{inr(val)}</span>
    </div>
  );
  return (
    <Card style={{ padding: 14 }}>
      <div className="serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Bill summary</div>
      {row("Item total", bill.subtotal)}
      {bill.express > 0 && row("Express fee", bill.express)}
      {row("Pickup & delivery", bill.pickup)}
      {row("Platform fee", bill.platform)}
      {row("GST (5%)", bill.gst)}
      <div style={{ borderTop: `1px dashed ${C.border}`, margin: "8px 0 4px" }} />
      {row("To pay", bill.total, true)}
    </Card>
  );
}

function BottomNav({ cur, goRoot, cartCount, onCart }) {
  const items = [
    { k: "home", label: "Home", icon: Home }, { k: "explore", label: "Explore", icon: Search },
    { k: "cart", label: "Pickup", icon: ShoppingBag, badge: cartCount }, { k: "orders", label: "Orders", icon: Package },
    { k: "profile", label: "You", icon: User },
  ];
  return (
    <div style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.surface, flex: "0 0 auto", paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}>
      {items.map((it) => {
        const active = cur === it.k;
        return (
          <button key={it.k} className="tap" onClick={() => (it.k === "cart" ? onCart() : goRoot(it.k))}
            style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: "10px 0 12px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? C.magenta : C.muted, position: "relative" }}>
            <div style={{ position: "relative" }}>
              <it.icon size={21} strokeWidth={active ? 2.4 : 2} />
              {it.badge > 0 && (
                <span style={{ position: "absolute", top: -6, right: -8, background: C.magenta, color: "#fff", fontSize: 9.5,
                  fontWeight: 800, minWidth: 16, height: 16, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 4px" }}>{it.badge}</span>
              )}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Spinner() {
  return <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin .7s linear infinite" }} />;
}

function Backdrop({ onClose }) {
  return <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(61,26,43,.45)", animation: "fadeIn .15s ease", zIndex: 40 }} />;
}

function SheetShell({ title, onClose, children }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: C.surface, borderTopLeftRadius: 24,
        borderTopRightRadius: 24, zIndex: 50, animation: "sheetUp .25s cubic-bezier(.2,.8,.2,1)", maxHeight: "88%",
        display: "flex", flexDirection: "column", boxShadow: "0 -10px 40px rgba(0,0,0,.2)" }}>
        <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${C.line}`, flex: "0 0 auto" }}>
          <div style={{ width: 38, height: 4, borderRadius: 99, background: C.border, position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)" }} />
          <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          <button className="tap" onClick={onClose} style={{ border: "none", background: C.line, borderRadius: 9, width: 32, height: 32,
            display: "grid", placeItems: "center", cursor: "pointer" }}><X size={17} color={C.muted} /></button>
        </div>
        <div className="scroll" style={{ overflowY: "auto", padding: 18 }}>{children}</div>
      </div>
    </>
  );
}

function CustomizeSheet({ sheet, profiles, onClose, onAddProfile, onAdd }) {
  const { service } = sheet;
  const [profileId, setProfileId] = useState(profiles[0]?.id || null);
  const [fabric, setFabric] = useState("self");
  const [express, setExpress] = useState(false);
  const [qty, setQty] = useState(1);
  useEffect(() => { if (!profiles.find((p) => p.id === profileId)) setProfileId(profiles[profiles.length - 1]?.id || null); }, [profiles]);

  const unitPrice = service.price + (fabric === "tailor" ? FABRIC_ADDON : 0);
  const lineTotal = qty * unitPrice + (express ? qty * EXPRESS_FEE : 0);
  const profile = profiles.find((p) => p.id === profileId);

  const opt = (active, onClick, title, sub, right) => (
    <button className="tap" onClick={onClick} style={{ width: "100%", textAlign: "left", border: `1.5px solid ${active ? C.magenta : C.border}`,
      background: active ? C.tint : C.surface, borderRadius: 13, padding: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
      <div style={{ width: 19, height: 19, borderRadius: "50%", border: `2px solid ${active ? C.magenta : C.border}`, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        {active && <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.magenta }} />}
      </div>
      <div style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{title}</b>{sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}</div>
      {right && <b style={{ fontSize: 13, color: C.ink }}>{right}</b>}
    </button>
  );

  return (
    <SheetShell title={service.name} onClose={onClose}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>{service.desc} · {inr(service.price)} · {service.etaDays} day{service.etaDays > 1 ? "s" : ""}</div>

      <Label>Measurements</Label>
      {profiles.map((p) => opt(profileId === p.id, () => setProfileId(p.id), p.label,
        Object.entries(p.values).filter(([, v]) => v).slice(0, 3).map(([k, v]) => `${k.split(" ")[0]} ${v}"`).join(" · ") || "No values yet"))}
      <button className="tap" onClick={onAddProfile} style={{ border: `1.5px dashed ${C.border}`, background: "transparent",
        borderRadius: 13, padding: 12, width: "100%", cursor: "pointer", color: C.magenta, fontWeight: 700, fontSize: 13.5,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 18 }}>
        <Plus size={16} /> Add new measurement profile
      </button>

      <Label>Fabric</Label>
      {opt(fabric === "self", () => setFabric("self"), "I'll provide the fabric", "Tailor stitches what you send")}
      {opt(fabric === "tailor", () => setFabric("tailor"), "Tailor sources fabric", "Curated fabric, charged on pickup", "+" + inr(FABRIC_ADDON))}

      <div style={{ height: 8 }} />
      <Label>Speed</Label>
      <button className="tap" onClick={() => setExpress(!express)} style={{ width: "100%", border: `1.5px solid ${express ? C.marigold : C.border}`,
        background: express ? C.tint2 : C.surface, borderRadius: 13, padding: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
        <Zap size={18} color={express ? C.marigold : C.muted} fill={express ? C.marigold : "none"} />
        <div style={{ flex: 1, textAlign: "left" }}><b style={{ fontSize: 14 }}>Express delivery</b>
          <div style={{ fontSize: 12, color: C.muted }}>Cut delivery time roughly in half</div></div>
        <span style={{ fontSize: 13, fontWeight: 800, color: express ? C.marigold : C.muted }}>+{inr(EXPRESS_FEE)}</span>
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <Label inline>Quantity</Label><Stepper value={qty} set={setQty} />
      </div>

      <Btn disabled={!profile} onClick={() => onAdd({ id: uid(), tailorId: sheet.tailor.id, tailorName: sheet.tailor.name,
        service, profileId, profileLabel: profile?.label, fabric, express, qty, unitPrice })}>
        Add to cart · {inr(lineTotal)}
      </Btn>
    </SheetShell>
  );
}

function MeasureSheet({ editing, onClose, onSave }) {
  const [label, setLabel] = useState(editing?.label || "");
  const [values, setValues] = useState(() => {
    const base = {}; MEASURE_FIELDS.forEach((f) => (base[f] = editing?.values?.[f] || "")); return base;
  });
  const valid = label.trim().length > 0;
  const input = (k) => (
    <div key={k} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 5, fontWeight: 600 }}>{k}</div>
      <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "0 12px", background: C.surface }}>
        <input value={values[k]} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value.replace(/[^\d.]/g, "") }))}
          inputMode="decimal" placeholder="0" style={{ border: "none", outline: "none", flex: 1, padding: "11px 0", fontSize: 14.5, fontFamily: "inherit", background: "transparent", color: C.ink }} />
        <span style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>inches</span>
      </div>
    </div>
  );
  return (
    <SheetShell title={editing ? "Edit measurements" : "New measurement profile"} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 5, fontWeight: 600 }}>Profile name</div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Mine, Wife, Son"
          style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "12px", fontSize: 14.5, fontFamily: "inherit", outline: "none", color: C.ink }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {MEASURE_FIELDS.map(input)}
      </div>
      <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 16px", lineHeight: 1.4 }}>
        Not sure of a measurement? Leave it blank — the tailor confirms at doorstep pickup.
      </p>
      <Btn disabled={!valid} onClick={() => onSave({ id: editing?.id || "p" + uid(), label: label.trim(), values })}>
        {editing ? "Save changes" : "Save profile"}
      </Btn>
    </SheetShell>
  );
}

function Label({ children, inline }) {
  return <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, textTransform: "uppercase", letterSpacing: ".05em",
    marginBottom: inline ? 0 : 9 }}>{children}</div>;
}
