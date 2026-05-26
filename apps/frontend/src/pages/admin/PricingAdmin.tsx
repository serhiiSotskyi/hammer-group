import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ORIGIN, getAdminToken } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChoiceOption, ParamSchemaJSON } from '@/types/paramSchema';

type AdminSchema = ParamSchemaJSON & {
  hingeUnitPrices?: Partial<Record<'A' | 'B', number>>;
  openingInsideSurcharge?: Partial<Record<'wood' | 'aluminium', number>>;
  heightSurcharges?: Partial<Record<'over2100' | 'over2300', number>>;
};

type SchemaResp = {
  categoryId: number;
  version: number;
  checksum: string;
  label: string;
  publishedAt: string | null;
  schema: AdminSchema;
};

type MergePayload = Record<string, unknown>;

async function fetchSchema() {
  const ts = Date.now();
  const res = await fetch(`${API_ORIGIN}/api/categories/interior/schema?ts=${ts}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load schema');
  return res.json() as Promise<SchemaResp>;
}

async function merge(payload: MergePayload) {
  const token = getAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_ORIGIN}/api/admin/schema/interior/merge`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Merge failed');
  return res.json() as Promise<unknown>;
}


export default function PricingAdmin() {
  const qc = useQueryClient();
  const schema = useQuery({ queryKey: ['interior-schema-admin'], queryFn: fetchSchema });
  const upsert = useMutation({
    mutationFn: merge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interior-schema-admin'] }),
  });

  // Use a safe fallback schema while loading to keep hooks order stable
  const s: AdminSchema = schema.data?.schema ?? { currency: 'GBP', rounding: { mode: 'HALF_UP', minorUnit: 1 }, groups: [] };

  // Admin page only edits numeric schema values; no live preview

  const getOption = (groupId: string, controlId: string, optionId: string): ChoiceOption | undefined => {
    const control = s.groups.find((group) => group.id === groupId)?.controls.find((item) => item.id === controlId);
    if (!control || !('options' in control)) return undefined;
    return control.options.find((option) => option.id === optionId);
  };

  const getFixedOptionCents = (option?: ChoiceOption) => {
    const strategy = option?.priceStrategy;
    return strategy?.type === 'FIXED' ? strategy.amountCents : 0;
  };

  const getOptionAmountUSD = (groupId: string, controlId: string, optionId: string) => {
    const o = getOption(groupId, controlId, optionId);
    const cents = getFixedOptionCents(o);
    return (cents / 100).toFixed(2);
  };

  const getRateUSDPer10 = () => {
    const c = s.groups.find((group) => group.id === 'sizes')?.controls.find((item) => item.id === 'depthMm');
    const cents = c?.priceStrategy?.type === 'PER_UNIT' ? c.priceStrategy.rateCents : 0;
    return (cents / 100).toFixed(2);
  };

  const getTierUSD = (groupId: string, controlId: string, optionId: string, which: 'below'|'above') => {
    const o = getOption(groupId, controlId, optionId);
    const strat = o?.priceStrategy;
    const cents = strat?.type === 'TIERED_BY_CONTROL'
      ? (which === 'below' ? strat.belowAmountCents : strat.aboveAmountCents)
      : getFixedOptionCents(o);
    return (cents / 100).toFixed(2);
  };

  // Render states after hooks to keep order consistent
  if (schema.isLoading) return <p>Завантаження…</p>;
  if (schema.error) return <p className="text-red-600">Не вдалося завантажити</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ціноутворення (Міжкімнатні)</h1>
        <span className="text-sm text-muted-foreground">Зміни застосовуються одразу</span>
      </div>

      {/* Removed old Door Block editor (not used in new customizer) */}

      {/* Removed legacy English Casings and 'Finish coat: Standard Plus' section */}

      <Card>
        <CardHeader><CardTitle>Lock (Замок)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['mechBlack','Механічний Чорний'],
            ['mechChrome','Механічний Хром'],
            ['magBlack','Магнітний Чорний'],
            ['magChrome','Магнітний Хром'],
          ].map(([id, label]) => (
            <div key={id as string}>
              <label className="text-sm block mb-1">{label} (USD)</label>
              <Input defaultValue={getOptionAmountUSD('lock','lockType',id as string)} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'lock', controlId: 'lockType', optionId: id, costUSD: Number(e.target.value) })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Casings (Лиштва)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Outer · Звичайні (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingOuter','normal')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingOuter', optionId: 'normal', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Inner · Звичайні (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingInner','normal')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingInner', optionId: 'normal', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Inner · Телескопічні (USD)</label>
            <Input defaultValue={getOptionAmountUSD('casings','casingInner','telescopic')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'casings', controlId: 'casingInner', optionId: 'telescopic', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stopper (Стопор)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm block mb-1">Фантом (USD)</label>
            <Input defaultValue={getOptionAmountUSD('stopper','stopper','phantom')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'stopper', controlId: 'stopper', optionId: 'phantom', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">MVM (USD)</label>
            <Input defaultValue={getOptionAmountUSD('stopper','stopper','mvm')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'stopper', controlId: 'stopper', optionId: 'mvm', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Edge (Торець)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">Чорний (USD)</label>
            <Input defaultValue={getOptionAmountUSD('edge','edgeColor','black')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'edge', controlId: 'edgeColor', optionId: 'black', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Золотий (USD)</label>
            <Input defaultValue={getOptionAmountUSD('edge','edgeColor','gold')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'edge', controlId: 'edgeColor', optionId: 'gold', costUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Срібний (USD)</label>
            <Input defaultValue={getOptionAmountUSD('edge','edgeColor','silver')} onBlur={(e) => upsert.mutate({ action: 'upsertOption', groupId: 'edge', controlId: 'edgeColor', optionId: 'silver', costUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Надбавка за глибину</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Ціна за +10 мм (USD)</label>
            <Input defaultValue={getRateUSDPer10()} onBlur={(e) => upsert.mutate({ action: 'updateRange', groupId: 'sizes', controlId: 'depthMm', rateUSDPer10: Number(e.target.value) })} />
          </div>
          <div className="text-sm text-muted-foreground self-end">Базова глибина — 100 мм; ціна застосовується за кожні +10 мм понад базу.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Петлі</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm block mb-1">За петлю (≤2100) · Звичайні (USD)</label>
            {(() => { const v = getTierUSD('hinges','hingeType','standard','below'); return (
              <Input key={`hinge-std-below-${v}`} defaultValue={v}
                onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'hinges', controlId: 'hingeType', optionId: 'standard', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(e.target.value), aboveUSD: Number(getTierUSD('hinges','hingeType','standard','above')) })} />
            ); })()}
          </div>
          <div>
            <label className="text-sm block mb-1">За петлю (&gt;2100) · Звичайні (USD)</label>
            {(() => { const v = getTierUSD('hinges','hingeType','standard','above'); return (
              <Input key={`hinge-std-above-${v}`} defaultValue={v}
                onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'hinges', controlId: 'hingeType', optionId: 'standard', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(getTierUSD('hinges','hingeType','standard','below')), aboveUSD: Number(e.target.value) })} />
            ); })()}
          </div>
          <div>
            <label className="text-sm block mb-1">За петлю (≤2100) · Приховані (USD)</label>
            {(() => { const v = getTierUSD('hinges','hingeType','hidden','below'); return (
              <Input key={`hinge-hid-below-${v}`} defaultValue={v}
                onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'hinges', controlId: 'hingeType', optionId: 'hidden', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(e.target.value), aboveUSD: Number(getTierUSD('hinges','hingeType','hidden','above')) })} />
            ); })()}
          </div>
          <div>
            <label className="text-sm block mb-1">За петлю (&gt;2100) · Приховані (USD)</label>
            {(() => { const v = getTierUSD('hinges','hingeType','hidden','above'); return (
              <Input key={`hinge-hid-above-${v}`} defaultValue={v}
                onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'hinges', controlId: 'hingeType', optionId: 'hidden', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(getTierUSD('hinges','hingeType','hidden','below')), aboveUSD: Number(e.target.value) })} />
            ); })()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Відкривання (всередину)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Ліве всередину ≤2100 (USD)</label>
            <Input defaultValue={getTierUSD('opening','opening','leftInside','below')} onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'opening', controlId: 'opening', optionId: 'leftInside', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(e.target.value), aboveUSD: Number(getTierUSD('opening','opening','leftInside','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Ліве всередину &gt;2100 (USD)</label>
            <Input defaultValue={getTierUSD('opening','opening','leftInside','above')} onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'opening', controlId: 'opening', optionId: 'leftInside', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(getTierUSD('opening','opening','leftInside','below')), aboveUSD: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Праве всередину ≤2100 (USD)</label>
            <Input defaultValue={getTierUSD('opening','opening','rightInside','below')} onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'opening', controlId: 'opening', optionId: 'rightInside', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(e.target.value), aboveUSD: Number(getTierUSD('opening','opening','rightInside','above')) })} />
          </div>
          <div>
            <label className="text-sm block mb-1">Праве всередину &gt;2100 (USD)</label>
            <Input defaultValue={getTierUSD('opening','opening','rightInside','above')} onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'opening', controlId: 'opening', optionId: 'rightInside', controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(getTierUSD('opening','opening','rightInside','below')), aboveUSD: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Короб</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['standard','complanar','inside'].map((opt) => (
            <div key={opt}>
              <label className="text-sm block mb-1">{{standard:'Стандарт', complanar:'Компланарний', inside:'Inside'}[opt as 'standard'|'complanar'|'inside'] || opt} (USD)</label>
              <Input defaultValue={getTierUSD('frame','frameType',opt,'below')} onBlur={(e) => upsert.mutate({ action: 'upsertOptionTiered', groupId: 'frame', controlId: 'frameType', optionId: opt, controlRefId: 'heightMm', threshold: 2100, belowUSD: Number(e.target.value), aboveUSD: Number(getTierUSD('frame','frameType',opt,'above')) })} />
            </div>
          ))}
        </CardContent>
      </Card>


      
    </div>
  );
}
