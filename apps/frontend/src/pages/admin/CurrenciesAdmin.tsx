import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentFx, setManualFx } from "@/services/api";

export default function CurrenciesAdmin() {
  const qc = useQueryClient();
  const fx = useQuery({ queryKey: ["fx-current"], queryFn: getCurrentFx, refetchOnWindowFocus: false });
  const save = useMutation({
    mutationFn: (payload: { rate: number; asOfDate?: string }) => setManualFx(payload.rate, payload.asOfDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fx-current"] });
    },
  });

  return (
    <div>
      <br />
      <br />
      <br />
      <br />
      <h1 className="text-3xl font-bold mb-6">Валюти</h1>
      <p className="text-muted-foreground mb-6">
        Ціни зберігаються у <strong>USD</strong>, а відображаються користувачу у <strong>UAH</strong>.
        Курс задається <strong>вручну</strong> адміністратором.
      </p>

      {fx.isLoading && <p>Завантаження поточного курсу…</p>}
      {fx.error && <p className="text-red-500">Не вдалося завантажити курс</p>}
      {fx.data && (
        <div className="rounded border p-4 mb-8">
          <div className="font-medium">Поточний курс (USD→UAH)</div>
          <div className="text-2xl font-bold">{fx.data.rate.toFixed(4)}</div>
          <div className="text-sm text-muted-foreground">станом на {new Date(fx.data.asOf).toLocaleDateString()} • Вручну</div>
        </div>
      )}

      <div className="rounded border p-4 space-y-3">
        <div className="font-medium">Встановити курс вручну</div>
        <p className="text-sm text-muted-foreground">Вкажіть курс USD→UAH. Система не оновлює його автоматично.</p>
        <form
          className="flex flex-col sm:flex-row gap-3 items-start"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const rate = Number(fd.get('rate'));
            const asOf = String(fd.get('asOf') || "");
            if (!Number.isFinite(rate) || rate <= 0) return alert('Вкажіть коректний додатний курс');
            save.mutate({ rate, asOfDate: asOf || undefined });
          }}
        >
          <input name="rate" type="number" step="0.0001" min="0" placeholder="Курс (наприклад, 41.4789)" className="border rounded px-3 py-2" />
          <input name="asOf" type="date" className="border rounded px-3 py-2" />
          <button type="submit" className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" disabled={save.isPending}>
            {save.isPending ? 'Збереження…' : 'Зберегти'}
          </button>
        </form>
      </div>
    </div>
  );
}
