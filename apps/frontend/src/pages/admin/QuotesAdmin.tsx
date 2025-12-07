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
      <h1 className="text-3xl font-bold mb-6">Заявки на двері</h1>

      {isLoading && <p>Завантаження…</p>}
      {error && <p className="text-red-500">Не вдалося завантажити</p>}
      {!isLoading && !error && (
        <div className="max-w-full overflow-x-auto">
          <table className="w-max min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2 whitespace-nowrap">Створено</th>
                <th className="p-2 whitespace-nowrap">Товар</th>
                <th className="p-2 whitespace-nowrap">Клієнт</th>
                <th className="p-2 whitespace-nowrap">Разом</th>
                <th className="p-2 whitespace-nowrap">Опрацьовано</th>
                <th className="p-2 whitespace-nowrap">Нотатки</th>
                <th className="p-2 whitespace-nowrap">Дії</th>
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
                      placeholder="Додати нотатку..."
                    />
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <Button size="sm" variant="secondary" onClick={() => { setActive(q); setOpen(true); }}>Переглянути</Button>
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
            <DialogTitle>Деталі заявки</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="font-medium mb-2">Клієнт</div>
                  <div className="text-sm">{active.customerName}</div>
                  <div className="text-sm">{active.customerEmail}</div>
                  <div className="text-sm">{active.customerPhone}</div>
                </Card>
                <Card className="p-4">
                  <div className="font-medium mb-2">Підсумки</div>
                  <div className="text-sm">База: {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(active.basePriceCents / 100)}</div>
                  <div className="text-sm">Надбавки: {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(active.adjustmentsCents / 100)}</div>
                  <div className="text-sm font-medium">Разом: {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(active.totalPriceCents / 100)}</div>
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
                      <div className="font-medium mb-2">Вибір</div>
                      <div className="space-y-1 text-sm">
                        {selections?.map((s, idx) => (
                          <div key={idx} className="flex justify-between gap-4">
                            <span>{s.groupLabel} · {s.controlLabel}</span>
                            <span className="text-muted-foreground">{s.displayValue}</span>
                          </div>
                        )) || <div className="text-muted-foreground">Немає даних</div>}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="font-medium mb-2">Структура ціни</div>
                      <div className="space-y-1 text-sm">
                        {breakdown?.map((b, idx) => (
                          <div key={idx} className="flex justify-between gap-4">
                            <span>{b.controlLabel}</span>
                            <span>{new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(b.deltaCents / 100)}</span>
                          </div>
                        )) || <div className="text-muted-foreground">Немає даних</div>}
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
