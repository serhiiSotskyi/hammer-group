import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ORIGIN, getAdminToken } from '@/services/api';
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
  const token = getAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_ORIGIN}/api/admin/schema/concealed/merge`, {
    method: 'POST', headers, body: JSON.stringify(payload), credentials: 'include',
  });
  if (!res.ok) throw new Error('Save failed');
  return res.json();
}

export default function PricingConcealed() {
  const qc = useQueryClient();
  const schema = useQuery({ queryKey: ['concealed-schema-admin'], queryFn: fetchSchema });
  const upsert = useMutation({ mutationFn: merge, onSuccess: () => qc.invalidateQueries({ queryKey: ['concealed-schema-admin'] }) });

  if (schema.isLoading) return <p>Завантаження…</p>;
  if (schema.error) return <p className="text-red-600">Не вдалося завантажити</p>;

  const s = schema.data?.schema;

  const getMultiplier = () => {
    const m = s?.displayMultiplier;
    return Number.isFinite(m) && m > 0 ? String(m) : '';
  };

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

  const getHingeUnitUSD = (type: 'A'|'B') => {
    const cents = s?.hingeUnitPrices?.[type] ?? 0;
    return (cents / (1.3*100)).toFixed(2);
  };

  const getOpeningInsideUSD = (mat: 'wood'|'aluminium') => {
    const cents = s?.openingInsideSurcharge?.[mat] ?? 0;
    return (cents / (1.3*100)).toFixed(2);
  };

  const getHeightSurchargeUSD = (which: 'over2100'|'over2300') => {
    const cents = s?.heightSurcharges?.[which] ?? 0;
    return (cents / (1.3*100)).toFixed(2);
  };

  const getOptionUSD = (groupId: string, controlId: string, optionId: string) => {
    const g = s.groups.find((g: any) => g.id === groupId);
    const c = g?.controls?.find((c: any) => c.id === controlId);
    const o = c?.options?.find((o: any) => o.id === optionId);
    const cents = o?.priceStrategy?.amountCents ?? 0;
    return (cents / (1.3*100)).toFixed(2);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ціноутворення (Приховані)</h1>
        <span className="text-sm text-muted-foreground">Зміни застосовуються одразу</span>
      </div>

      <Card>
        <CardHeader><CardTitle>Множник відображення (лише на опції)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Multiplier</label>
            <Input defaultValue={getMultiplier()} placeholder="e.g., 1.3" onBlur={(e) => upsert.mutate({ action:'setDisplayMultiplier', multiplier: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Полотно дверей (панель)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Дерево ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','wood','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'wood', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('construction','frame','wood','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Дерево &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','wood','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'wood', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('construction','frame','wood','below')), aboveUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Алюміній ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','aluminium','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'aluminium', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('construction','frame','aluminium','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Алюміній &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('construction','frame','aluminium','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'construction', controlId:'frame', optionId:'aluminium', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('construction','frame','aluminium','below')), aboveUSD:Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Тип встановлення</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Під штукатурку ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPlaster','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPlaster', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('install','installType','flushPlaster','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Під штукатурку &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPlaster','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPlaster', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('install','installType','flushPlaster','below')), aboveUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Під панелі ≤ 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPanels','below')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPanels', controlRefId:'heightMm', threshold:2100, belowUSD:Number(e.target.value), aboveUSD:Number(getTierUSD('install','installType','flushPanels','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Під панелі &gt; 2100 (USD)</label>
            <Input defaultValue={getTierUSD('install','installType','flushPanels','above')} onBlur={(e) => upsert.mutate({ action:'upsertOptionTiered', groupId:'install', controlId:'installType', optionId:'flushPanels', controlRefId:'heightMm', threshold:2100, belowUSD:Number(getTierUSD('install','installType','flushPanels','below')), aboveUSD:Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Розміри</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Надбавка (USD) якщо &gt; 2100</label>
            <Input defaultValue={getHeightSurchargeUSD('over2100')} onBlur={(e) => upsert.mutate({ action:'setHeightSurcharges', over2100USD: Number(e.target.value), over2300USD: Number(getHeightSurchargeUSD('over2300')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Додаткова надбавка (USD) якщо &gt; 2300</label>
            <Input defaultValue={getHeightSurchargeUSD('over2300')} onBlur={(e) => upsert.mutate({ action:'setHeightSurcharges', over2100USD: Number(getHeightSurchargeUSD('over2100')), over2300USD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Петлі (стандарт): ціна за одиницю</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Тип A (USD за 1 шт)</label>
            <Input defaultValue={getHingeUnitUSD('A')} onBlur={(e) => upsert.mutate({ action:'setHingeUnitPrices', AUSD: Number(e.target.value), BUSD: Number(getHingeUnitUSD('B')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Тип B (USD за 1 шт)</label>
            <Input defaultValue={getHingeUnitUSD('B')} onBlur={(e) => upsert.mutate({ action:'setHingeUnitPrices', AUSD: Number(getHingeUnitUSD('A')), BUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Сторона відкривання (Inside) — націнки</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Для Брус (USD)</label>
            <Input defaultValue={getOpeningInsideUSD('wood')} onBlur={(e) => upsert.mutate({ action:'setOpeningInsideSurcharge', woodUSD: Number(e.target.value), aluminiumUSD: Number(getOpeningInsideUSD('aluminium')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Для Алюміній (USD)</label>
            <Input defaultValue={getOpeningInsideUSD('aluminium')} onBlur={(e) => upsert.mutate({ action:'setOpeningInsideSurcharge', woodUSD: Number(getOpeningInsideUSD('wood')), aluminiumUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      {/* Budget hinges use unit price A × count; no totals needed */}

      <Card>
        <CardHeader><CardTitle>Бюджетні (Universal): Торець</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Чорний (USD)</label>
            <Input defaultValue={getOptionUSD('edge','edgeColor','black')} onBlur={(e) => upsert.mutate({ action:'upsertOption', groupId:'edge', controlId:'edgeColor', optionId:'black', costUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Золотий (USD)</label>
            <Input defaultValue={getOptionUSD('edge','edgeColor','gold')} onBlur={(e) => upsert.mutate({ action:'upsertOption', groupId:'edge', controlId:'edgeColor', optionId:'gold', costUSD:Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Срібний (USD)</label>
            <Input defaultValue={getOptionUSD('edge','edgeColor','silver')} onBlur={(e) => upsert.mutate({ action:'upsertOption', groupId:'edge', controlId:'edgeColor', optionId:'silver', costUSD:Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
