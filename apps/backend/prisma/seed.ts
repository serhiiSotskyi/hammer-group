import { PrismaClient, SchemaStatus } from "@prisma/client";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const interiorSchemaV1 = {
  currency: "GBP",
  rounding: { mode: "HALF_UP", minorUnit: 1 },
  groups: [
    {
      id: "doorBlock",
      label: "Door Block",
      controls: [
        {
          id: "doorBlock",
          type: "radio",
          label: "Door Block",
          required: true,
          defaultValue: "standard",
          options: [
            { id: "standard", label: "Standard frame", priceStrategy: { type: "FIXED", amountCents: 0 } },
            // extra prices are costs without profit; apply 1.3x for client price
            { id: "complanar", label: "Complanar frame", priceStrategy: { type: "FIXED", amountCents: 5850 } }, // 45 * 1.3 * 100
            { id: "inside", label: "INSIDE frame", priceStrategy: { type: "FIXED", amountCents: 10920 } }, // 84 * 1.3 * 100
          ],
        },
      ],
    },
    {
      id: "construction",
      label: "Door Construction",
      controls: [
        {
          id: "leafType",
          type: "radio",
          label: "Door Leaf",
          required: true,
          defaultValue: "with-rebate",
          options: [
            {
              id: "with-rebate",
              label: "With rebate",
              priceStrategy: { type: "FIXED", amountCents: 0 },
            },
            {
              id: "without-rebate",
              label: "Without rebate",
              priceStrategy: { type: "FIXED", amountCents: 800 },
            },
          ],
        },
        {
          id: "leafFill",
          type: "radio",
          label: "Leaf Fill",
          required: true,
          defaultValue: "solid",
          options: [
            {
              id: "solid",
              label: "Solid core",
              priceStrategy: { type: "FIXED", amountCents: 4200 },
            },
            {
              id: "light",
              label: "Lightweight honeycomb",
              priceStrategy: { type: "FIXED", amountCents: 0 },
            },
          ],
        },
      ],
    },
    {
      id: "finish",
      label: "Finish",
      controls: [
        {
          id: "finishType",
          type: "select",
          label: "Finish",
          required: true,
          defaultValue: "standard",
          options: [
            {
              id: "standard",
              label: "Standard paint",
              priceStrategy: { type: "FIXED", amountCents: 0 },
            },
            {
              id: "premium",
              label: "Premium lacquer",
              priceStrategy: { type: "FIXED", amountCents: 6500 },
            },
            {
              id: "veneer",
              label: "Natural veneer",
              priceStrategy: { type: "FIXED", amountCents: 4800 },
            },
          ],
        },
      ],
    },
    {
      id: "casings",
      label: "Door Casings",
      controls: [
        {
          id: "casingFront",
          type: "radio",
          label: "Front side",
          required: true,
          defaultValue: "overlay",
          options: [
            { id: "overlay", label: "Overlay", priceStrategy: { type: "FIXED", amountCents: 1690 } }, // 13 * 1.3 * 100
            { id: "telescopic", label: "Telescopic", priceStrategy: { type: "FIXED", amountCents: 2080 } }, // 16 * 1.3 * 100
          ],
        },
        {
          id: "casingInner",
          type: "radio",
          label: "Inner side",
          required: true,
          defaultValue: "overlay",
          options: [
            { id: "overlay", label: "Overlay", priceStrategy: { type: "FIXED", amountCents: 1690 } },
            { id: "telescopic", label: "Telescopic", priceStrategy: { type: "FIXED", amountCents: 2080 } },
          ],
        },
      ],
    },
    {
      id: "hardware",
      label: "Hardware",
      controls: [
        {
          id: "softClose",
          type: "boolean",
          label: "Soft close",
          defaultValue: false,
          priceStrategy: { type: "FIXED", amountCents: 2200 },
        },
        {
          id: "hiddenHinges",
          type: "boolean",
          label: "Hidden hinges",
          defaultValue: false,
          priceStrategy: { type: "FIXED", amountCents: 3800 },
        },
      ],
    },
    {
      id: "dimensions",
      label: "Dimensions",
      controls: [
        {
          id: "heightMm",
          type: "range",
          label: "Height (mm)",
          unit: "mm",
          min: 1900,
          max: 2400,
          step: 10,
          defaultValue: 2000,
          priceStrategy: {
            type: "PER_UNIT",
            unit: "MILLIMETER",
            rateCents: 6,
            unitsFrom: "deltaFromDefault",
          },
        },
        {
          id: "widthMm",
          type: "range",
          label: "Width (mm)",
          unit: "mm",
          min: 600,
          max: 1000,
          step: 10,
          defaultValue: 800,
          priceStrategy: {
            type: "PER_UNIT",
            unit: "MILLIMETER",
            rateCents: 8,
            unitsFrom: "deltaFromDefault",
          },
        },
      ],
    },
  ],
};

async function main() {
  await prisma.quote.deleteMany();
  await prisma.paramSchema.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();

  const interior = await prisma.category.create({
    data: {
      name: "Interior Doors",
      slug: "interior",
    },
  });

  await prisma.category.createMany({
    data: [
      { name: "Concealed Doors", slug: "concealed" },
      { name: "Cabinet Furniture", slug: "furniture" },
    ],
  });

  // Interior collections
  const classicCol = await prisma.collection.create({ data: { categoryId: interior.id, name: "Classic", slug: "classic" } });
  const modernCol = await prisma.collection.create({ data: { categoryId: interior.id, name: "Modern", slug: "modern" } });

  await prisma.product.createMany({
    data: [
      {
        name: "Classic Oak",
        slug: "classic-oak",
        basePriceCents: 34900,
        imageUrl: "/doors/classic-oak.jpg",
        categoryId: interior.id,
        collectionId: classicCol.id,
      },
      {
        name: "Modern White",
        slug: "modern-white",
        basePriceCents: 38900,
        imageUrl: "/doors/modern-white.jpg",
        categoryId: interior.id,
        collectionId: modernCol.id,
      },
    ],
  });

  // Concealed Doors: sample product and schema
  const concealed = await prisma.category.findUnique({ where: { slug: "concealed" } });
  if (concealed) {
    await prisma.product.createMany({
      data: [
        { name: "Concealed Basic", slug: "concealed-basic", basePriceCents: 49900, imageUrl: "/doors/concealed-basic.jpg", categoryId: concealed.id, description: "Entry concealed door type with core features." },
        { name: "Concealed Flush", slug: "concealed-flush", basePriceCents: 52900, imageUrl: "/doors/concealed-flush.jpg", categoryId: concealed.id, description: "Flush with wall minimalist appearance." },
        { name: "Concealed Tall", slug: "concealed-tall", basePriceCents: 55900, imageUrl: "/doors/concealed-tall.jpg", categoryId: concealed.id, description: "Increased height concealed system." },
        { name: "Concealed Acoustic", slug: "concealed-acoustic", basePriceCents: 58900, imageUrl: "/doors/concealed-acoustic.jpg", categoryId: concealed.id, description: "Improved sound dampening package." },
        { name: "Concealed Glass", slug: "concealed-glass", basePriceCents: 61900, imageUrl: "/doors/concealed-glass.jpg", categoryId: concealed.id, description: "Glass panel concealed construction." },
        { name: "Concealed Premium", slug: "concealed-premium", basePriceCents: 67900, imageUrl: "/doors/concealed-premium.jpg", categoryId: concealed.id, description: "Premium hardware and finishes." },
      ],
    });

    const concealedSchemaV1 = {
      currency: "GBP",
      rounding: { mode: "HALF_UP", minorUnit: 1 },
      displayMultiplier: 1.3,
      // Concealed pricing helpers
      hingeUnitPrices: { A: 0, B: 0 },
      openingInsideSurcharge: { wood: 0, aluminium: 0 },
      heightSurcharges: { over2100: 0, over2300: 0 },
      groups: [
        {
          id: 'sizes',
          label: 'Sizes',
          controls: [
            { id: 'heightMm', type: 'range', label: 'Height (mm)', min: 2000, max: 3000, step: 10, defaultValue: 2100 },
            // optional width/depth can be added later
          ],
        },
        {
          id: "construction",
          label: "Construction",
          controls: [
            {
              id: "frame",
              type: "radio",
              label: "Frame",
              required: true,
              defaultValue: "wood",
              options: [
                { id: "wood", label: "Wood frame", priceStrategy: { type: "FIXED", amountCents: 6800 } },
                { id: "aluminium", label: "Aluminium frame", priceStrategy: { type: "FIXED", amountCents: 24000 } },
                { id: "box-putty", label: "Box for putty", priceStrategy: { type: "FIXED", amountCents: 15000 } },
                { id: "box-panel", label: "Box for panel", priceStrategy: { type: "FIXED", amountCents: 13800 } },
                { id: "inside", label: "Inside (with edge)", priceStrategy: { type: "FIXED", amountCents: 6500 } },
                { id: "inside-aluminium", label: "Inside for aluminium", priceStrategy: { type: "FIXED", amountCents: 6500 } },
                { id: "al-edge", label: "Aluminium edge", priceStrategy: { type: "FIXED", amountCents: 4700 } },
              ],
            },
          ],
        },
        {
          id: "finish",
          label: "Finish (per side)",
          controls: [
            {
              id: "finishType",
              type: "select",
              label: "Finish",
              required: true,
              defaultValue: "pvc",
              options: [
                { id: "pvc", label: "PVC", priceStrategy: { type: "FIXED", amountCents: 2600 } },
                { id: "mirror", label: "Mirror", priceStrategy: { type: "FIXED", amountCents: 12000 } },
                { id: "paint-matte", label: "Matte paint", priceStrategy: { type: "FIXED", amountCents: 10000 } },
                { id: "paint-gloss", label: "Gloss paint", priceStrategy: { type: "FIXED", amountCents: 15600 } },
                { id: "veneer", label: "Veneer (no lacquer)", priceStrategy: { type: "FIXED", amountCents: 6000 } },
                { id: "primer", label: "Primer", priceStrategy: { type: "FIXED", amountCents: 1500 } },
              ],
            },
          ],
        },
        {
          id: 'install',
          label: 'Installation',
          controls: [
            { id: 'installType', type: 'radio', label: 'Тип монтажу', required: true, defaultValue: 'flushPlaster', options: [
              { id: 'flushPlaster', label: 'Під штукатурку', priceStrategy: { type: 'FIXED', amountCents: 0 } },
              { id: 'flushPanels', label: 'Під панелі', priceStrategy: { type: 'FIXED', amountCents: 0 } },
            ] },
          ],
        },
        {
          id: 'opening',
          label: 'Сторона відкривання',
          controls: [
            { id: 'opening', type: 'radio', label: 'Сторона', required: true, defaultValue: 'left', options: [
              { id: 'left', label: 'Ліве', priceStrategy: { type: 'FIXED', amountCents: 0 } },
              { id: 'right', label: 'Праве', priceStrategy: { type: 'FIXED', amountCents: 0 } },
              { id: 'leftInside', label: 'Ліве inside', priceStrategy: { type: 'FIXED', amountCents: 0 } },
              { id: 'rightInside', label: 'Праве inside', priceStrategy: { type: 'FIXED', amountCents: 0 } },
            ] },
          ],
        },
        {
          id: "hardware",
          label: "Hardware",
          controls: [
            { id: "magneticLock", type: "boolean", label: "Magnetic lock", defaultValue: false, priceStrategy: { type: "FIXED", amountCents: 0 } },
            { id: "magneticStopper", type: "boolean", label: "Magnetic stopper", defaultValue: false, priceStrategy: { type: "FIXED", amountCents: 0 } },
            { id: "dropDownThreshold", type: "boolean", label: "Drop-down threshold", defaultValue: false, priceStrategy: { type: "FIXED", amountCents: 0 } },
            { id: "paintFrameCasing", type: "boolean", label: "Paint frame + casing", defaultValue: false, priceStrategy: { type: "FIXED", amountCents: 0 } },
          ],
        },
        {
          id: "paint",
          label: "Painting",
          controls: [
            { id: "paint-box", type: "boolean", label: "Paint box", defaultValue: false, priceStrategy: { type: "FIXED", amountCents: 1500 } },
            { id: "paint-box-frame", type: "boolean", label: "Paint box and frame", defaultValue: false, priceStrategy: { type: "FIXED", amountCents: 2000 } },
          ],
        },
        // Hinges select for budget overrides 2/3/4 defined dynamically; for standard, server per-unit logic applies
        {
          id: 'hinges',
          label: 'Петлі',
          controls: [
            { id: 'hinges', type: 'select', label: 'Hinges', defaultValue: '3', options: [
              { id: '3', label: '3', priceStrategy: { type: 'FIXED', amountCents: 0 } },
              { id: '4', label: '4', priceStrategy: { type: 'FIXED', amountCents: 0 } },
              { id: '5', label: '5', priceStrategy: { type: 'FIXED', amountCents: 0 } },
            ] },
          ],
        },
      ],
    };

    const concealedChecksum = createHash("sha256").update(JSON.stringify(concealedSchemaV1)).digest("hex");
    const concealedSchema = await prisma.paramSchema.create({
      data: {
        categoryId: concealed.id,
        version: 1,
        status: SchemaStatus.PUBLISHED,
        label: "Concealed v1",
        json: concealedSchemaV1,
        checksum: concealedChecksum,
        publishedAt: new Date(),
      },
    });
    await prisma.category.update({ where: { id: concealed.id }, data: { activeSchemaId: concealedSchema.id } });
  }

  const checksum = createHash("sha256")
    .update(JSON.stringify(interiorSchemaV1))
    .digest("hex");

  const schema = await prisma.paramSchema.create({
    data: {
      categoryId: interior.id,
      version: 1,
      status: SchemaStatus.PUBLISHED,
      label: "Interior v1",
      json: interiorSchemaV1,
      checksum,
      publishedAt: new Date(),
    },
  });

  await prisma.category.update({
    where: { id: interior.id },
    data: { activeSchemaId: schema.id },
  });

  // Seed admin user if env credentials provided
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    });
    console.log(`✅ Seeded admin user ${adminEmail}`);
  }

  console.log("✅ Seeded interior category with pricing schema");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
