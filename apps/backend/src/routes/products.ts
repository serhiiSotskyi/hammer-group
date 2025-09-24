import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// ✅ Get all products (optional filter by categoryId)
router.get("/", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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

// ✅ Create product
router.post("/", async (req, res) => {
  try {
    const { name, description, basePrice, imageUrl, categoryId } = req.body;
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        basePrice,
        imageUrl,
        categoryId,
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ✅ Update product
router.put("/:id", async (req, res) => {
  try {
    const { name, description, basePrice, imageUrl, categoryId } = req.body;
    const updatedProduct = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { name, description, basePrice, imageUrl, categoryId },
    });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// ✅ Delete product
router.delete("/:id", async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
