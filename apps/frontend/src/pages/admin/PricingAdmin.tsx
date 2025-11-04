import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ORIGIN } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SchemaResp = {
  categoryId: number;
  version: number;
  checksum: string;
  label: string;
  publishedAt: string | null;
  schema: any;
};

async function fetchSchema() {
  const ts = Date.now();
  const res = await fetch(`${API_ORIGIN}/api/categories/interior/schema?ts=${ts}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load schema');
  return res.json() as Promise<SchemaResp>;
}

async function merge(payload: any) {
  const res = await fetch(`${API_ORIGIN}/api/admin/schema/interior/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Merge failed');
  return res.json();
}


export default function PricingAdmin() {
  const qc = useQueryClient();
  const schema = useQuery({ queryKey: ['interior-schema-admin'], queryFn: fetchSchema });
  const upsert = useMutation({
    mutationFn: merge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interior-schema-admin'] }),
  });

  // Use a safe fallback schema while loading to keep hooks order stable
  const s = schema.data?.schema ?? { currency: 'GBP', rounding: { mode: 'HALF_UP', minorUnit: 1 }, groups: [] };

  // Admin page only edits numeric schema values; no live preview

  const getOptionAmountUSD = (groupId: string, controlId: string, optionId: string) => {
    const g = s.groups.find((g: any) => g.id === groupId);
    const c = g?.controls?.find((c: any) => c.id === controlId);
    const o = c?.options?.find((o: any) => o.id === optionId);
    const cents = o?.priceStrategy?.amountCents ?? 0;
    // reverse from 1.3 markup for display convenience
    return (cents / (1.3 * 100)).toFixed(2);
  };

  const getThresholdUSD = (controlId: string) => {
    const g = s.groups.find((g: any) => g.id === 'sizes');
    const c = g?.controls?.find((c: any) => c.id === controlId);
    const cents = c?.priceStrategy?.amountCents ?? 0;
    return (cents / (1.3 * 100)).toFixed(2);
  };

  const getRateUSDPer10 = () => {
    const g = s.groups.find((g: any) => g.id === 'sizes');
    const c = g?.controls?.find((c: any) => c.id === 'depthMm');
    const cents = c?.priceStrategy?.rateCents ?? 0;
    return (cents / (1.3 * 100)).toFixed(2);
  };

  // Render states after hooks to keep order consistent
  if (schema.isLoading) return <p>Loading…</p>;
  if (schema.error) return <p className="text-red-600">Failed to load</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pricing (Interior)</h1>
        <span className="text-sm text-muted-foreground">Changes apply immediately</span>
      </div>

      <Card>
        <CardHeader><CardTitle>Door Block</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Complanar cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('doorBlock','doorBlock','complanar')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'doorBlock', controlId: 'doorBlock', optionId: 'complanar', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">INSIDE cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('doorBlock','doorBlock','inside')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'doorBlock', controlId: 'doorBlock', optionId: 'inside', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Casings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Front Overlay cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingFront','overlay')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingFront', optionId: 'overlay', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Front Telescopic cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingFront','telescopic')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingFront', optionId: 'telescopic', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Inner Overlay cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingInner','overlay')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingInner', optionId: 'overlay', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Inner Telescopic cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingInner','telescopic')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingInner', optionId: 'telescopic', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Finish coat</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Standard Plus cost (USD)</label>
            <Input defaultValue={getOptionAmountUSD('finishCoat','finishCoat','standardPlus')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'finishCoat', controlId: 'finishCoat', optionId: 'standardPlus', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sizes (dropdowns)</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {['heightMm','widthMm','depthMm'].map((cid) => {
            const g = s.groups.find((g: any) => g.id === 'sizes');
            const c = g?.controls?.find((c: any) => c.id === cid && c.type === 'select');
            if (!c) return null;
            return (
              <div key={cid} className="space-y-2">
                <div className="text-sm font-medium capitalize">{cid.replace('Mm',' (mm)')}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {c.options?.map((o: any) => (
                    <div key={o.id}>
                      <label className="text-sm block mb-1">{o.label} (USD)</label>
                      <Input defaultValue={getOptionAmountUSD('sizes', cid, o.id)} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'sizes', controlId: cid, optionId: o.id, costUSD: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hinges</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Type · Звичайні (USD)</label>
            <Input defaultValue={getOptionAmountUSD('hinges','hingeType','standard')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'hinges', controlId: 'hingeType', optionId: 'standard', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Type · Сховані (USD)</label>
            <Input defaultValue={getOptionAmountUSD('hinges','hingeType','hidden')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'hinges', controlId: 'hingeType', optionId: 'hidden', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Amount · 2 (USD)</label>
            <Input defaultValue={getOptionAmountUSD('hinges','hingeCount','2')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'hinges', controlId: 'hingeCount', optionId: '2', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Amount · 3 (USD)</label>
            <Input defaultValue={getOptionAmountUSD('hinges','hingeCount','3')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'hinges', controlId: 'hingeCount', optionId: '3', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
}
