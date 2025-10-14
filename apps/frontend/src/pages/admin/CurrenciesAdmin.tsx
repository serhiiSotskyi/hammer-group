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
      <h1 className="text-3xl font-bold mb-6">Currencies</h1>
      <p className="text-muted-foreground mb-6">
        Website prices are stored in <strong>USD</strong> and shown to users in <strong>UAH</strong>.
        The exchange rate is managed <strong>manually</strong> by an administrator.
      </p>

      {fx.isLoading && <p>Loading current rate…</p>}
      {fx.error && <p className="text-red-500">Failed to load current rate</p>}
      {fx.data && (
        <div className="rounded border p-4 mb-8">
          <div className="font-medium">Current rate (USD→UAH)</div>
          <div className="text-2xl font-bold">{fx.data.rate.toFixed(4)}</div>
          <div className="text-sm text-muted-foreground">as of {new Date(fx.data.asOf).toLocaleDateString()} • Manual</div>
        </div>
      )}

      <div className="rounded border p-4 space-y-3">
        <div className="font-medium">Set manual rate</div>
        <p className="text-sm text-muted-foreground">Enter the USD→UAH rate. This system does not auto-update from NBU.</p>
        <form
          className="flex flex-col sm:flex-row gap-3 items-start"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const rate = Number(fd.get('rate'));
            const asOf = String(fd.get('asOf') || "");
            if (!Number.isFinite(rate) || rate <= 0) return alert('Enter a valid positive rate');
            save.mutate({ rate, asOfDate: asOf || undefined });
          }}
        >
          <input name="rate" type="number" step="0.0001" min="0" placeholder="Rate (e.g., 41.4789)" className="border rounded px-3 py-2" />
          <input name="asOf" type="date" className="border rounded px-3 py-2" />
          <button type="submit" className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save override'}
          </button>
        </form>
      </div>
    </div>
  );
}
