import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import conclealedDoor from '@/assets/conclealed-door.png';

const leaves = [
  {
    id: "classic-oak",
    name: "Classic Oak",
    price: 350,
    image: conclealedDoor,
  },
  {
    id: "modern-white",
    name: "Modern White",
    price: 420,
    image: conclealedDoor,
  },
  {
    id: "luxury-walnut",
    name: "Luxury Walnut",
    price: 600,
    image: conclealedDoor,
  },
];

export default function ConclealedDoorsPage() {
  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">Conclealed Doors</h1>
      <p className="text-lg text-gray-700 mb-10">
        Discover our collection of premium concealed door leaves, crafted for durability and elegant design.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {leaves.map((leaf) => (
          <Card key={leaf.id} className="overflow-hidden transition hover:shadow-lg">
            <img
              src={leaf.image}
              alt={leaf.name}
              className="w-full h-68 object-cover"
            />
            <CardHeader>
              <CardTitle>{leaf.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-4">From €{leaf.price}</p>
              <Link to={`/customizer?leaf=${leaf.id}&price=${leaf.price}`}>
                <Button className="w-full premium-button">Customize</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
