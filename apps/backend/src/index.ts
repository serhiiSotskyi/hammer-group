import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Hammer Group API is running 🚀");
});

// ✅ Get all categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { products: true },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ✅ Get all products (optional filter by category)
app.get("/api/products", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId: Number(categoryId) } : undefined,
      include: { category: true },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ✅ Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// 🔹 NEW: Get parameter groups + options for a category
app.get("/api/categories/:id/parameters", async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    const groups = await prisma.parameterGroup.findMany({
      where: { categoryId },
      include: { options: true },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch parameters for category" });
  }
});

// 🔹 NEW: Get parameter groups + options for a product
app.get("/api/products/:id/parameters", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          include: {
            groups: { include: { options: true } },
          },
        },
      },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    // For now, just return all category groups + options
    res.json(product.category.groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch parameters for product" });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
