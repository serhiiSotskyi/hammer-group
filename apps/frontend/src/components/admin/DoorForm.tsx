import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function DoorForm({ categoryId, door }: { categoryId: number; door?: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(door || { name: "", basePrice: 0, description: "", imageUrl: "" });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (door) {
        return fetch(`http://localhost:4000/api/products/${door.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        return fetch("http://localhost:4000/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, categoryId }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doors", categoryId] });
      setOpen(false);
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {door ? "Edit" : "Add Door"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{door ? "Edit Door" : "Add Door"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(form);
            }}
            className="space-y-4"
          >
            <Input
              placeholder="Door name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Base price"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
            />
            <Input
              placeholder="Image URL"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            <textarea
              className="border p-2 rounded w-full"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
