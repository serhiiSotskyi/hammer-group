import { useEffect, useState } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../services/api";

type Product = {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  categoryId: number;
};

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    imageUrl: "",
    categoryId: "",
  });

  const fetchData = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateProduct(editing.id, {
        ...form,
        basePrice: Number(form.basePrice),
        categoryId: Number(form.categoryId),
      });
      setEditing(null);
    } else {
      await createProduct({
        ...form,
        basePrice: Number(form.basePrice),
        categoryId: Number(form.categoryId),
      });
    }
    setForm({ name: "", description: "", basePrice: "", imageUrl: "", categoryId: "" });
    fetchData();
  };

  const handleEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      basePrice: product.basePrice.toString(),
      imageUrl: product.imageUrl,
      categoryId: product.categoryId.toString(),
    });
  };

  const handleDelete = async (id: number) => {
    await deleteProduct(id);
    fetchData();
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-8 max-w-lg">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 w-full"
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border p-2 w-full"
        />
        <input
          type="number"
          placeholder="Base Price"
          value={form.basePrice}
          onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
          className="border p-2 w-full"
          required
        />
        <input
          type="text"
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="border p-2 w-full"
        />
        <input
          type="number"
          placeholder="Category ID"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="border p-2 w-full"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          {editing ? "Update Product" : "Add Product"}
        </button>
      </form>

      {/* Product List */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Price</th>
            <th className="border p-2">Category</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.id}</td>
              <td className="border p-2">{p.name}</td>
              <td className="border p-2">€{p.basePrice}</td>
              <td className="border p-2">{p.categoryId}</td>
              <td className="border p-2 flex gap-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
