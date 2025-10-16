import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ORIGIN } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SchemaResp = { checksum: string; schema: any };

async function fetchSchema() {
  const ts = Date.now();
  const res = await fetch(`${API_ORIGIN}/api/categories/concealed/schema?ts=${ts}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load schema');
  return res.json() as Promise<SchemaResp>;
}

async function merge(payload: any) {
  const res = await fetch(`${API_ORIGIN}/api/admin/schema/concealed/merge`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include',
  });
  if (!res.ok) throw new Error('Save failed');
  return res.json();
}

export default function PricingConcealed() {
  const qc = useQueryClient();
  const schema = useQuery({ queryKey: ['concealed-schema-admin'], queryFn: fetchSchema });
  const upsert = useMutation({ mutationFn: merge, onSuccess: () => qc.invalidateQueries({ queryKey: ['concealed-schema-admin'] }) });

  if (schema.isLoading) return <p>Loading…</p>;
  if (schema.error) return <p className="text-red-600">Failed to load</p>;

  const s = schema.data?.schema;

  const getTierUSD = (groupId: string, controlId: string, optionId: string, which: 'below'|'above') => {
    const g = s.groups.find((g: any) => g.id === groupId);
    const c = g?.controls?.find((c: any) => c.id === controlId);
    const o = c?.options?.find((o: any) => o.id === optionId);
    const strat = o?.priceStrategy;
    const cents = strat?.type === 'TIERED_BY_CONTROL' ? (which === 'below' ? strat.belowAmountCents : strat.aboveAmountCents) : 0;
    return (cents / (1.3 * 100)).toFixed(2);
  };

  const getThresholdUSD = () => {
    const g = s.groups.find((g: any) => g.id === 'sizes');
    const c = g?.controls?.find((c: any) => c.id === 'heightMm');
    const cents = c?.priceStrategy?.amountCents ?? 0;
    return (cents / (1.3 * 100)).toFixed(2);
  };

  const getHingeUSD = (optId: '3'|'4'|'5') => {
    const g = s.groups.find((g: any) => g.id === 'hinges');
    const c = g?.controls?.find((c: any) => c.id === 'hinges');
    const o = c?.options?.find((o: any) => o.id === optId);
    const cents = o?.priceStrategy?.amountCents ?? 0;
    return (cents / (1.3*100)).toFixed(2);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pricing (Concealed)</h1>
        <span className="text-sm text-muted-foreground">Changes apply immediately</span>
      </div>

      <Card>
        <CardHeader><CardTitle>Door Leaf (Panel)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Timber ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','wood','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'wood', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('construction','frame','wood','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Timber &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','wood','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'wood', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('construction','frame','wood','below')), aboveUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Aluminium ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','aluminium','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'aluminium', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('construction','frame','aluminium','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Aluminium &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','aluminium','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'aluminium', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('construction','frame','aluminium','below')), aboveUSD:Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Installation Type</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Flush plaster ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPlaster','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPlaster', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('install','installType','flushPlaster','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Flush plaster &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPlaster','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPlaster', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('install','installType','flushPlaster','below')), aboveUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Flush panels ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPanels','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPanels', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('install','installType','flushPanels','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Flush panels &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPanels','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPanels', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('install','installType','flushPanels','below')), aboveUSD:Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sizes</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Height base bump (USD) if &gt; 2100</label>
            <Input defaultValue={getThresholdUSD()} onBlur={(e) => upsert.mutate({ action:'updateRange', groupId:'sizes', controlId:'heightMm', costUSD:Number(e.target.value), strategyType:'THRESHOLD_FIXED', threshold:2100 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hinges (amounts)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">3 Hinges (USD)</label>
            <Input defaultValue={getHingeUSD('3')} onBlur={(e) => upsert.mutate({ action:'upsertOption', groupId:'hinges', controlId:'hinges', optionId:'3', costUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">4 Hinges (USD)</label>
            <Input defaultValue={getHingeUSD('4')} onBlur={(e) => upsert.mutate({ action:'upsertOption', groupId:'hinges', controlId:'hinges', optionId:'4', costUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">5 Hinges (USD)</label>
            <Input defaultValue={getHingeUSD('5')} onBlur={(e) => upsert.mutate({ action:'upsertOption', groupId:'hinges', controlId:'hinges', optionId:'5', costUSD:Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
