import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminQuotes, updateAdminQuote, AdminQuote } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function QuotesAdmin() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-quotes"], queryFn: listAdminQuotes });
  const update = useMutation({
    mutationFn: (p: { id: string; payload: Partial<Pick<AdminQuote, "delivered" | "adminNotes">> }) =>
      updateAdminQuote(p.id, p.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quotes"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const [open, setOpen] = React.useState(false as boolean);
  const [active, setActive] = React.useState<AdminQuote | null>(null);

  return (
    <div>
      <br />
      <br />
      <br />
      <br />
      <h1 className="text-3xl font-bold mb-6">Door Quotes</h1>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">Failed to load</p>}
      {!isLoading && !error && (
        <div className="max-w-full overflow-x-auto">
          <table className="w-max min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2 whitespace-nowrap">Created</th>
                <th className="p-2 whitespace-nowrap">Product</th>
                <th className="p-2 whitespace-nowrap">Customer</th>
                <th className="p-2 whitespace-nowrap">Total</th>
                <th className="p-2 whitespace-nowrap">Delivered</th>
                <th className="p-2 whitespace-nowrap">Admin Notes</th>
                <th className="p-2 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((q) => (
                <tr key={q.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">{new Date(q.createdAt).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">{q.product?.name}</td>
                  <td className="p-2 whitespace-nowrap">
                    {q.customerName} · {q.customerEmail} · {q.customerPhone}
                  </td>
                  <td className="p-2 whitespace-nowrap">{new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(q.totalPriceCents / 100)}</td>
                  <td className="p-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={q.delivered}
                      onChange={(e) => update.mutate({ id: q.id, payload: { delivered: e.target.checked } })}
                    />
                  </td>
                  <td className="p-2 min-w-[240px]">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      defaultValue={q.adminNotes ?? ''}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== (q.adminNotes ?? '')) {
                          update.mutate({ id: q.id, payload: { adminNotes: val } });
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="font-medium mb-2">Customer</div>
                  <div className="text-sm">{active.customerName}</div>
                  <div className="text-sm">{active.customerEmail}</div>
                  <div className="text-sm">{active.customerPhone}</div>
                </Card>
                <Card className="p-4">
                  <div className="font-medium mb-2">Totals</div>
                  <div className="text-sm">Base: {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(active.basePriceCents / 100)}</div>
                  <div className="text-sm">Adjustments: {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(active.adjustmentsCents / 100)}</div>
                  <div className="text-sm font-medium">Total: {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(active.totalPriceCents / 100)}</div>
                </Card>
              </div>
              {/* Selections */}
              {(() => {
                // Render resolved selections if server included it in the model. Some clients may not fetch it.
                const anyActive = active as unknown as any;
                const selections = anyActive.resolvedSelections as Array<any> | undefined;
                const breakdown = (anyActive.breakdown as Array<any> | undefined) || [];
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <div className="font-medium mb-2">Selections</div>
                      <div className="space-y-1 text-sm">
                        {selections?.map((s, idx) => (
                          <div key={idx} className="flex justify-between gap-4">
                            <span>{s.groupLabel} · {s.controlLabel}</span>
                            <span className="text-muted-foreground">{s.displayValue}</span>
                          </div>
                        )) || <div className="text-muted-foreground">Not available</div>}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="font-medium mb-2">Price breakdown</div>
                      <div className="space-y-1 text-sm">
                        {breakdown?.map((b, idx) => (
                          <div key={idx} className="flex justify-between gap-4">
                            <span>{b.controlLabel}</span>
                            <span>{new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(b.deltaCents / 100)}</span>
                          </div>
                        )) || <div className="text-muted-foreground">Not available</div>}
                      </div>
                    </Card>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React from "react";
