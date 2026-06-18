import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TAILORS = [
  {
    name: "Sharma Tailors", area: "Krishna Nagar", distanceKm: 0.8, rating: 4.7, ratingCount: 1240,
    express: true, gradient: ["#C2185B", "#E0457B"], specialties: ["Men's wear", "Suits", "Kurta"],
    about: "Three generations of tailoring in Krishna Nagar. Specialists in formal menswear and ethnic stitching.",
    services: [
      ["stitch", "Formal shirt stitching", 700, 6, "Full sleeve, machine + hand finish"],
      ["stitch", "Trouser stitching", 800, 6, "Pleated or flat-front"],
      ["alter", "Trouser alteration", 150, 2, "Length, waist or taper"],
      ["suit", "2-piece suit / blazer", 3200, 10, "Canvassed front, custom lining"],
      ["kurta", "Kurta-pajama set", 950, 7, "Cotton, silk or linen"],
    ],
    reviews: [["Rohit M.", 5, "Suit fit was spot on, picked up and delivered on time."], ["Aman S.", 4, "Good stitching, slightly delayed by a day."]],
  },
  {
    name: "Reema's Stitch Studio", area: "Laxmi Nagar", distanceKm: 1.6, rating: 4.8, ratingCount: 860,
    express: true, gradient: ["#E0457B", "#F4A300"], specialties: ["Blouses", "Salwar suits", "Gowns"],
    about: "Women's boutique tailoring with an eye for fit. Doorstep measurement on request.",
    services: [
      ["blouse", "Blouse stitching (lined)", 450, 4, "Princess-cut, padded option"],
      ["alter", "Saree fall & pico", 120, 2, "Machine pico + fall stitch"],
      ["kurta", "Salwar suit set", 1200, 7, "Top, bottom & dupatta finish"],
      ["stitch", "Custom dress / gown", 2800, 9, "From your design or reference"],
      ["alter", "Blouse alteration", 180, 3, "Resize, dart, hook adjust"],
    ],
    reviews: [["Priya K.", 5, "Blouse fitting was perfect, loved the finishing."], ["Neha R.", 5, "Copied my reference dress exactly."]],
  },
  {
    name: "Gandhi Nagar Silai Co.", area: "Gandhi Nagar", distanceKm: 2.4, rating: 4.5, ratingCount: 2100,
    express: false, gradient: ["#0E7C7B", "#34A8A2"], specialties: ["Volume", "Home furnishing", "Basics"],
    about: "High-volume stitching unit in Asia's largest garment hub. Great value, dependable for bulk.",
    services: [
      ["stitch", "Shirt stitching", 600, 6, "Everyday cotton shirts"],
      ["kurta", "Cotton kurta", 650, 5, "Simple, breathable cut"],
      ["home", "Curtain stitching (per panel)", 250, 3, "Eyelet or pleated header"],
      ["home", "Bedsheet edging", 150, 2, "Hem & corner finish"],
      ["stitch", "Trouser stitching", 750, 6, "Cotton or formal"],
    ],
    reviews: [["Vikas T.", 4, "Cheap and reliable for bulk shirts."], ["Sunita D.", 5, "Got 6 curtains done, neat work."]],
  },
  {
    name: "Royal Darzi House", area: "Preet Vihar", distanceKm: 3.1, rating: 4.6, ratingCount: 540,
    express: true, gradient: ["#9E1350", "#C2185B"], specialties: ["Bridal", "Sherwani", "Premium"],
    about: "Premium bridal and occasion wear. Hand-finished lehengas and sherwanis with multiple fittings.",
    services: [
      ["bridal", "Custom lehenga", 5500, 14, "3 fittings, hand finishing"],
      ["bridal", "Sherwani", 6500, 16, "Embroidered, lined, with churidar"],
      ["suit", "3-piece suit", 4200, 12, "Premium fabric tailoring"],
      ["blouse", "Heavy-work blouse", 1200, 8, "Embellished, padded"],
    ],
    reviews: [["Ishita G.", 5, "My wedding lehenga fit beautifully."], ["Karan B.", 4, "Sherwani was excellent, premium pricing."]],
  },
  {
    name: "Anita Blouse & Ethnic", area: "Vivek Vihar", distanceKm: 2.9, rating: 4.9, ratingCount: 430,
    express: false, gradient: ["#F4A300", "#E0457B"], specialties: ["Designer blouse", "Saree", "Ethnic"],
    about: "Boutique known for designer blouses and pre-stitched sarees. Highest ratings on Darzi.",
    services: [
      ["blouse", "Designer blouse", 950, 6, "Backless, knots, piping"],
      ["stitch", "Saree pre-stitch", 1500, 7, "Ready-to-wear conversion"],
      ["bridal", "Lehenga blouse", 1800, 9, "Bridal-grade finishing"],
      ["kurta", "Anarkali suit", 1300, 8, "Flared, lined, custom"],
    ],
    reviews: [["Megha S.", 5, "Best blouse fitting I've ever had."], ["Tara N.", 5, "Pre-stitched saree was a lifesaver."]],
  },
  {
    name: "QuickFit Alterations", area: "Mayur Vihar", distanceKm: 3.6, rating: 4.4, ratingCount: 1500,
    express: true, gradient: ["#34A8A2", "#0E7C7B"], specialties: ["Same-day", "Alterations", "Repairs"],
    about: "Express alteration specialists. Most jobs back in 24 hours with doorstep pickup and drop.",
    services: [
      ["alter", "Pant alteration", 150, 1, "Length / waist same day"],
      ["alter", "Shirt alteration", 140, 1, "Slim-fit, sleeve, length"],
      ["alter", "Jeans hemming", 120, 1, "Original hem retained"],
      ["alter", "Suit alteration", 400, 2, "Jacket & trouser"],
      ["alter", "Zip replacement", 180, 1, "Jacket, jeans, bags"],
    ],
    reviews: [["Deepak J.", 4, "Got my pants altered same day."], ["Ritu A.", 5, "Saved my outfit hours before an event."]],
  },
];

async function main() {
  console.log("Resetting tables…");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.measurementProfile.deleteMany();
  await prisma.review.deleteMany();
  await prisma.service.deleteMany();
  await prisma.address.deleteMany();
  await prisma.tailor.deleteMany();
  await prisma.user.deleteMany();

  // demo user + address + measurements
  const user = await prisma.user.create({
    data: {
      name: "Kunal Singh", phone: "+919876543210",
      addresses: { create: { label: "Home", line1: "B-42", area: "Krishna Nagar", city: "Delhi", pincode: "110051" } },
      profiles: {
        create: {
          label: "Mine",
          measurements: { create: [
            { key: "Chest / Bust", valueIn: 38 }, { key: "Waist", valueIn: 32 }, { key: "Hips", valueIn: 40 },
            { key: "Shoulder", valueIn: 17 }, { key: "Sleeve length", valueIn: 24 }, { key: "Garment length", valueIn: 40 },
          ] },
        },
      },
    },
    include: { addresses: true, profiles: true },
  });

  // tailors + services + reviews
  const createdTailors = [];
  for (const t of TAILORS) {
    const tailor = await prisma.tailor.create({
      data: {
        name: t.name, area: t.area, distanceKm: t.distanceKm, rating: t.rating, ratingCount: t.ratingCount,
        express: t.express, gradient: JSON.stringify(t.gradient), specialties: JSON.stringify(t.specialties), about: t.about,
        services: { create: t.services.map(([category, name, basePrice, etaDays, description]) => ({ category, name, basePrice, etaDays, description })) },
        reviews: { create: t.reviews.map(([n, rating, comment]) => ({ rating, comment, userId: user.id })) },
      },
      include: { services: true },
    });
    createdTailors.push(tailor);
  }

  // one in-progress demo order so the Orders tab isn't empty
  const reema = createdTailors.find((t) => t.name.includes("Reema"));
  const svc = reema.services[0];
  await prisma.order.create({
    data: {
      userId: user.id, tailorId: reema.id, addressId: user.addresses[0].id,
      status: "STITCHING", pickupSlot: "Tomorrow, 10 AM–12 PM",
      subtotal: svc.basePrice, fees: 44, gst: Math.round(svc.basePrice * 0.05),
      total: svc.basePrice + 44 + Math.round(svc.basePrice * 0.05),
      paymentMethod: "UPI", paymentStatus: "PAID",
      items: { create: { serviceId: svc.id, profileId: user.profiles[0].id, fabricOption: "self", express: false, qty: 1, unitPrice: svc.basePrice } },
    },
  });

  console.log(`✅ Seeded ${createdTailors.length} tailors, demo user (${user.phone}) and 1 sample order.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());