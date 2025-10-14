import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Inquiry = {
  id: number;
  type: "GENERAL" | "FURNITURE";
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  delivered: boolean;
  adminNotes?: string | null;
  createdAt: string;
};

async function fetchFurnitureInquiries(): Promise<Inquiry[]> {
  const res = await fetch("http://localhost:4000/api/admin/inquiries?type=FURNITURE", { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to load submissions");
  return res.json();
}

export default function FurnitureAdmin() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["furniture-inquiries"], queryFn: fetchFurnitureInquiries });
  const [open, setOpen] = useState(false as boolean);
  const [active, setActive] = useState<Inquiry | null>(null);
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<Inquiry> & { id: number }) => {
      const res = await fetch(`http://localhost:4000/api/admin/inquiries/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered: payload.delivered, adminNotes: payload.adminNotes }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["furniture-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return (
    <div>
      <br />
      <br />
      <br />
      <br />
      <h1 className="text-3xl font-bold mb-6">Furniture Quotes</h1>

      <div className="grid gap-10">
        {/* Submissions table */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">User Requests</h2>
          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">Failed to load</p>}
          {!isLoading && !error && (
            <div className="max-w-full overflow-x-auto">
              <table className="w-max min-w-[1000px] text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2 whitespace-nowrap">Created</th>
                    <th className="p-2 whitespace-nowrap">Name</th>
                    <th className="p-2 whitespace-nowrap">Phone</th>
                    <th className="p-2 whitespace-nowrap">Delivered</th>
                    <th className="p-2 whitespace-nowrap">Admin Notes</th>
                    <th className="p-2 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((q) => (
                    <tr key={q.id} className="border-b">
                      <td className="p-2 whitespace-nowrap">{new Date(q.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">{q.name}</td>
                      <td className="p-2 whitespace-nowrap">{q.phone || '-'}</td>
                      <td className="p-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={q.delivered}
                          onChange={(e) => updateMutation.mutate({ id: q.id, delivered: e.target.checked })}
                        />
                      </td>
                      <td className="p-2 min-w-[240px]">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          defaultValue={q.adminNotes ?? ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== (q.adminNotes ?? '')) {
                              updateMutation.mutate({ id: q.id, adminNotes: val });
                            }
                          }}
                          placeholder="Add note..."
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => { setActive(q); setOpen(true); }}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Created:</span> {new Date(active.createdAt).toLocaleString()}</div>
              <div><span className="font-medium">Name:</span> {active.name}</div>
              <div><span className="font-medium">Email:</span> {active.email || '-'}</div>
              <div><span className="font-medium">Phone:</span> {active.phone || '-'}</div>
              <div className="mt-4">
                <div className="font-medium mb-1">Message</div>
                <div className="whitespace-pre-wrap">{active.message || '-'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
