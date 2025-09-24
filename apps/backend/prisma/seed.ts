import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Clear existing data (keeps dev DB clean)
  await prisma.productParameter.deleteMany();
  await prisma.parameterOption.deleteMany();
  await prisma.parameterGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Categories
  const interior = await prisma.category.create({
    data: { name: "Interior Doors" },
  });

  const concealed = await prisma.category.create({
    data: { name: "Concealed Doors" },
  });

  const furniture = await prisma.category.create({
    data: { name: "Cabinet Furniture" },
  });

  // Products (Interior Doors)
  const classicOak = await prisma.product.create({
    data: {
      name: "Classic Oak",
      basePrice: 350,
      description: "A timeless oak interior door",
      imageUrl: "/doors/classic-oak.jpg",
      categoryId: interior.id,
    },
  });

  const modernWhite = await prisma.product.create({
    data: {
      name: "Modern White",
      basePrice: 420,
      description: "Minimalist white lacquered door",
      imageUrl: "/doors/modern-white.jpg",
      categoryId: interior.id,
    },
  });

  // Parameter Groups & Options for Interior Doors
  await prisma.parameterGroup.create({
    data: {
      name: "Door Leaf",
      type: "select",
      isRequired: true,
      categoryId: interior.id,
      options: {
        create: [
          { name: "With rebate", extraPrice: 0 },
          { name: "Without rebate", extraPrice: 0 },
        ],
      },
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Leaf Fill",
      type: "select",
      isRequired: true,
      categoryId: interior.id,
      options: {
        create: [
          { name: "Solid", extraPrice: 50 },
          { name: "Lightened", extraPrice: 0 },
        ],
      },
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Casings (Outside)",
      type: "select",
      isRequired: false,
      categoryId: interior.id,
      options: {
        create: [
          { name: "None", extraPrice: 0 },
          { name: "Overlay", extraPrice: 40 },
          { name: "Telescopic", extraPrice: 60 },
        ],
      },
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Casings (Inside)",
      type: "select",
      isRequired: false,
      categoryId: interior.id,
      options: {
        create: [
          { name: "None", extraPrice: 0 },
          { name: "Overlay", extraPrice: 40 },
          { name: "Telescopic", extraPrice: 60 },
        ],
      },
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Opening Direction",
      type: "select",
      isRequired: true,
      categoryId: interior.id,
      options: {
        create: [
          { name: "Inward Right", extraPrice: 0 },
          { name: "Inward Left", extraPrice: 0 },
          { name: "Outward Right", extraPrice: 0 },
          { name: "Outward Left", extraPrice: 0 },
        ],
      },
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Finish",
      type: "select",
      isRequired: true,
      categoryId: interior.id,
      options: {
        create: [
          { name: "Standard", extraPrice: 0 },
          { name: "Standard Plus", extraPrice: 80 },
        ],
      },
    },
  });

  // Dimensions with range
  await prisma.parameterGroup.create({
    data: {
      name: "Height",
      type: "range",
      isRequired: true,
      categoryId: interior.id,
      min: 1900,
      max: 2400,
      step: 10,
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Width",
      type: "range",
      isRequired: true,
      categoryId: interior.id,
      min: 600,
      max: 1000,
      step: 10,
    },
  });

  await prisma.parameterGroup.create({
    data: {
      name: "Depth",
      type: "range",
      isRequired: true,
      categoryId: interior.id,
      min: 70,
      max: 200,
      step: 10,
    },
  });

  console.log("✅ Seed data with ranges inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
