import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DoorForm from "./DoorForm";

async function fetchDoors(categoryId: number) {
  const res = await fetch(`http://localhost:4000/api/products?categoryId=${categoryId}`);
  if (!res.ok) throw new Error("Failed to load doors");
  return res.json();
}

export default function DoorTable({ categoryId }: { categoryId: number }) {
  const queryClient = useQueryClient();
  const { data: doors, isLoading } = useQuery({
    queryKey: ["doors", categoryId],
    queryFn: () => fetchDoors(categoryId),
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Doors</h2>
        <DoorForm categoryId={categoryId} />
      </div>

      <div className="grid gap-4">
        {doors.map((door: any) => (
          <Card key={door.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold">{door.name}</p>
              <p className="text-sm text-gray-500">€{door.basePrice}</p>
            </div>
            <div className="flex gap-2">
              <DoorForm categoryId={categoryId} door={door} /> {/* Edit */}
              <Button
                variant="destructive"
                onClick={async () => {
                  await fetch(`http://localhost:4000/api/products/${door.id}`, {
                    method: "DELETE",
                  });
                  queryClient.invalidateQueries({ queryKey: ["doors", categoryId] });
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
