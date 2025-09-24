import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// API base
const API_URL = "http://localhost:4000";

async function fetchInteriorDoors() {
  const res = await fetch(`${API_URL}/api/products?categoryId=1`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default function InteriorDoorsPage() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["interior-doors"],
    queryFn: fetchInteriorDoors,
  });

  if (isLoading) return <p className="p-10">Loading doors...</p>;
  if (error) return <p className="p-10 text-red-500">Error loading doors</p>;

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">Interior Doors</h1>
      <p className="text-lg text-gray-700 mb-10">
        Discover our collection of premium interior door leaves, crafted for durability and elegant design.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((door: any) => (
          <Card key={door.id} className="overflow-hidden transition hover:shadow-lg">
            <img
              src={door.imageUrl || "/placeholder-door.png"}
              alt={door.name}
              className="w-full h-68 object-cover"
            />
            <CardHeader>
              <CardTitle>{door.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-4">From €{door.basePrice}</p>
              <Link to={`/customizer?productId=${door.id}`}>
                <Button className="w-full premium-button">Customize</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
