"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calculator, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { formatCurrencyByLang } from '@/lib/format';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { createInteriorQuote, getProducts, priceInteriorQuote, resolveImageUrl, getCategorySchema } from "@/services/api";
import { BooleanControl, Control, ParamSchemaJSON, RangeControl, SelectControl } from "@/types/paramSchema";

const DEFAULT_PRODUCT_SLUG = "concealed-basic";

function formatCurrency(amountCents: number, currency: string, lang: string) {
  return formatCurrencyByLang(amountCents, currency, lang);
}

export default function ConcealedCustomizer({ productSlug = DEFAULT_PRODUCT_SLUG }: { productSlug?: string }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const schemaQuery = useQuery({ queryKey: ["concealed", "schema"], queryFn: () => getCategorySchema("concealed") });
  const productQuery = useQuery({
    queryKey: ["concealed", "product", productSlug],
    queryFn: async () => (await getProducts({ slug: productSlug }))[0],
    enabled: Boolean(productSlug),
  });

  // Extract controls from schema for fixed layout
  const schema = schemaQuery.data?.schema as ParamSchemaJSON | undefined;
  const findCtrl = (groupId: string, controlId: string) => {
    const g = schema?.groups.find((g) => g.id === groupId);
    return g?.controls.find((c) => c.id === controlId);
  };
  const heightCtrl = findCtrl('sizes', 'heightMm') as RangeControl | undefined;
  const widthCtrl = findCtrl('sizes', 'widthMm') as RangeControl | undefined;
  const depthCtrl = findCtrl('sizes', 'depthMm') as RangeControl | undefined;
  const frameCtrl = findCtrl('construction', 'frame') as SelectControl | undefined;
  const installCtrl = findCtrl('install', 'installType') as SelectControl | undefined;
  const openingCtrl = findCtrl('opening', 'opening') as SelectControl | undefined;
  const finishCtrl = findCtrl('finish', 'finishType') as SelectControl | undefined;
  const hingesCtrl = findCtrl('hinges', 'hinges') as SelectControl | undefined;
  const hardwareGroup = schema?.groups.find((g) => g.id === 'hardware');

  // Selections
  const [sel, setSel] = useState<Record<string, unknown>>({});
  const setVal = (id: string, value: unknown) => setSel((p) => ({ ...p, [id]: value }));
  const product = productQuery.data;

  // Initialize defaults once schema loads
  useEffect(() => {
    if (!schema) return;
    setSel((prev) => ({
      ...prev,
      ...(heightCtrl ? { heightMm: heightCtrl.defaultValue } : {}),
      ...(widthCtrl ? { widthMm: widthCtrl.defaultValue } : {}),
      ...(depthCtrl ? { depthMm: depthCtrl.defaultValue } : {}),
      ...(frameCtrl ? { frame: frameCtrl.defaultValue ?? frameCtrl.options[0]?.id } : {}),
      ...(installCtrl ? { installType: installCtrl.defaultValue ?? installCtrl.options[0]?.id } : {}),
      ...(openingCtrl ? { opening: openingCtrl.defaultValue ?? openingCtrl.options[0]?.id } : {}),
      ...(finishCtrl ? { finishType: finishCtrl.defaultValue ?? finishCtrl.options[0]?.id } : {}),
      // Only set hinges default for Budget doors; for Standard, server derives by height
      ...((product?.doorType === 'BUDGET' && hingesCtrl) ? { hinges: hingesCtrl.defaultValue ?? hingesCtrl.options[0]?.id } : {}),
      // Hardware booleans default false
      ...((hardwareGroup?.controls || []).reduce((acc: any, c) => {
        if (c.type === 'boolean') acc[c.id] = (c as BooleanControl).defaultValue ?? false;
        return acc;
      }, {})),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaQuery.data?.checksum, product?.doorType]);

  // Enforce Timber disabled above 2300 in UI
  const heightVal = Number(sel.heightMm ?? heightCtrl?.defaultValue ?? 2100);
  const timberDisabled = heightVal > 2300;

  // For Budget (Universal) doors, enforce a hard UI max of 2100
  const heightMaxUi = useMemo(() => {
    const schemaMax = heightCtrl?.max ?? 3000;
    return product?.doorType === 'BUDGET' ? Math.min(2100, schemaMax) : schemaMax;
  }, [product?.doorType, heightCtrl?.max]);

  // Clamp height and hinges on change to avoid server 422; user can always choose MORE hinges than minimum
  useEffect(() => {
    if (!heightCtrl) return;
    const min = heightCtrl.min ?? 1800;
    const max = heightMaxUi;
    const clamped = Math.max(min, Math.min(max, heightVal));
    if (clamped !== heightVal) {
      setVal('heightMm', clamped);
      return; // hinges will be handled in next run with updated height
    }
    // Ensure hinges are at least the minimum allowed by height (both Standard and Budget)
    if (hingesCtrl) {
      const current = sel.hinges ? String(sel.hinges) : undefined;
      const minAllowed = heightVal > 2300 ? '5' : heightVal > 2100 ? '4' : '3';
      // If no selection yet, or current is below minimum, set to minAllowed. Otherwise keep user's higher choice.
      if (!current || (current === '3' && minAllowed !== '3') || (current === '4' && minAllowed === '5')) {
        setVal('hinges', minAllowed);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightVal, product?.doorType]);

  const priceQuery = useQuery({
    queryKey: ["concealed", "price", productSlug, schemaQuery.data?.checksum, sel],
    queryFn: () => priceInteriorQuote(productSlug, sel),
    enabled: Boolean(productSlug && schemaQuery.data?.checksum && Object.keys(sel).length > 0),
    refetchOnWindowFocus: false,
  });

  const quoteMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string }) => createInteriorQuote(productSlug, sel, payload),
    onSuccess: () => { setForm({ name: '', phone: '' }); toast({ title: t('customizer.quoteSavedTitle'), description: t('contact.managerSoon') }); setOpen(false); },
    onError: (error: unknown) => toast({ title: t('customizer.quoteFailedTitle'), description: error instanceof Error ? error.message : t('customizer.quoteFailedDesc'), variant: 'destructive' }),
  });

  const loading = schemaQuery.isLoading || productQuery.isLoading || !schema;
  const price = priceQuery.data;
  const currency = price?.currency ?? 'UAH';
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <Skeleton className="h-10 w-64 mx-auto mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="h-[420px] w-full" />
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-48 w-full" />))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!schema || !product) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 text-center text-muted-foreground">{t('customizer.unable')}</div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">{t('customizer.concealedTitle', { defaultValue: 'Concealed Door Customizer' })}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('customizer.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: preview + totals + breakdown */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-accent" /> {t('customizer.preview')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={resolveImageUrl(product.imageUrl) || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/placeholder.svg"; }} />
                </div>
                <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('common.basePrice')}</span><span className="font-medium">{formatCurrency(price?.basePriceCents ?? product.basePriceCents, currency, i18n.language)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('common.adjustments')}</span><span className="font-medium">{price ? formatCurrency(price.adjustmentsCents, currency, i18n.language) : "--"}</span></div>
                  <div className="flex items-center justify-between border-t border-primary/20 pt-3"><span className="text-sm text-muted-foreground">{t('common.total')}</span><Badge variant="secondary" className="bg-accent text-accent-foreground"><Calculator className="w-3 h-3 mr-1" />{price ? formatCurrency(price.totalPriceCents, currency, i18n.language) : t('customizer.updating')}</Badge></div>
                  {priceQuery.isFetching && (<div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> {t('customizer.updating')}</div>)}
                  <p className="text-xs text-muted-foreground">{t('common.priceNote')}</p>
                </div>
              </CardContent>
            </Card>

            {price?.breakdown?.length ? (
              <Card>
                <CardHeader><CardTitle>{t('customizer.priceBreakdown')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {price.breakdown
                    .filter((line) => {
                      const allowedGroups = new Set(['sizes','construction','install','hardware','hinges','opening']);
                      const allowedControls = new Set(['heightMm','frame','installType','magneticLock','magneticStopper','dropDownThreshold','paintFrameCasing','hinges','opening']);
                      return allowedGroups.has(line.groupId) && allowedControls.has(line.controlId);
                    })
                    .map((line) => (
                    <div key={`${line.groupId}-${line.controlId}-${String(line.selection)}`} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t(`schema.controls.${line.controlId}`, { defaultValue: line.controlLabel })}</p>
                        <p className="text-xs text-muted-foreground">{String(line.displayValue ?? line.selection)}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(line.deltaCents, currency, i18n.language)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Right: fixed layout controls */}
          <div className="space-y-6">
            {/* Sizes */}
            {heightCtrl && (
              <Card>
                <CardHeader><CardTitle>{t('schema.groups.sizes', { defaultValue: 'Sizes' })}</CardTitle></CardHeader>
                <CardContent>
                  <div>
                    <Label>{t('schema.controls.heightMm', { defaultValue: 'Height (mm)' })}</Label>
                    <Input
                      type="number"
                      min={heightCtrl.min}
                      max={heightMaxUi}
                      step={heightCtrl.step}
                      value={Number(sel.heightMm ?? heightCtrl.defaultValue)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const clamped = Math.max(heightCtrl.min ?? v, Math.min(heightMaxUi, v));
                        setVal('heightMm', clamped);
                      }}
                    />
                    {product?.doorType === 'BUDGET' && <p className="text-xs text-muted-foreground">Max 2100 mm for Universal doors</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Door Leaf */}
            {frameCtrl && (
              <Card>
                <CardHeader><CardTitle>{t('schema.groups.construction', { defaultValue: 'Door Leaf (Panel)' })}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Label>{t('schema.controls.frame', { defaultValue: frameCtrl.label })}</Label>
                  <RadioGroup value={(sel.frame as string) ?? ''} onValueChange={(v) => setVal('frame', v)}>
                    {frameCtrl.options.map((o) => (
                      <div key={o.id} className="flex items-center space-x-3 opacity-100">
                        <RadioGroupItem value={o.id} id={`frame-${o.id}`} disabled={o.id === 'wood' && timberDisabled} />
                        <Label htmlFor={`frame-${o.id}`} className={o.id === 'wood' && timberDisabled ? 'text-gray-400' : ''}>{t(`schema.options.frame.${o.id}`, { defaultValue: o.label })}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {timberDisabled && <p className="text-xs text-muted-foreground">Timber unavailable above 2300 mm</p>}
                </CardContent>
              </Card>
            )}

            {/* Installation Type */}
            {installCtrl && (
              <Card>
                <CardHeader><CardTitle>{t('schema.groups.install', { defaultValue: 'Installation Type' })}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Label>{t('schema.controls.installType', { defaultValue: installCtrl.label })}</Label>
                  <RadioGroup value={(sel.installType as string) ?? ''} onValueChange={(v) => setVal('installType', v)}>
                    {installCtrl.options.map((o) => (
                      <div key={o.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={o.id} id={`install-${o.id}`} />
                        <Label htmlFor={`install-${o.id}`}>{t(`schema.options.installType.${o.id}`, { defaultValue: o.label })}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Opening Direction (no price) */}
            {openingCtrl && (
              <Card>
                <CardHeader><CardTitle>{t('schema.groups.opening', { defaultValue: 'Opening' })}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Label>{t('schema.controls.opening', { defaultValue: openingCtrl.label })}</Label>
                  <RadioGroup value={(sel.opening as string) ?? ''} onValueChange={(v) => setVal('opening', v)}>
                    {openingCtrl.options.map((o) => (
                      <div key={o.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={o.id} id={`opening-${o.id}`} />
                        <Label htmlFor={`opening-${o.id}`}>{t(`schema.options.opening.${o.id}`, { defaultValue: o.label })}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Finish */}
            {/* Finish removed per latest requirement */}

            {/* Hardware (optional toggles) */}
            {hardwareGroup && (
              <Card>
                <CardHeader><CardTitle>{t('schema.groups.hardware', { defaultValue: hardwareGroup.label })}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {hardwareGroup.controls.filter((c) => c.type === 'boolean' && ['magneticLock','magneticStopper','dropDownThreshold','paintFrameCasing'].includes(c.id as string)).map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <Label>{t(`schema.controls.${c.id}`, { defaultValue: c.label })}</Label>
                      <Switch checked={Boolean(sel[c.id])} onCheckedChange={(v) => setVal(c.id, v)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Hinges: user can select; options below minimum are disabled based on height */}
            {hingesCtrl && (
              <Card>
                <CardHeader><CardTitle>{t('schema.groups.hinges', { defaultValue: 'Hinges' })}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Label>{t('schema.controls.hinges', { defaultValue: hingesCtrl.label ?? 'Hinges' })}</Label>
                  <RadioGroup value={(sel.hinges as string) ?? ''} onValueChange={(v) => setVal('hinges', v)}>
                    {hingesCtrl.options.map((o) => {
                      const disabled = (heightVal > 2100 && o.id === '3') || (heightVal > 2300 && (o.id === '3' || o.id === '4'));
                      return (
                        <div key={o.id} className="flex items-center space-x-3">
                          <RadioGroupItem value={o.id} id={`hinges-${o.id}`} disabled={disabled} />
                          <Label htmlFor={`hinges-${o.id}`} className={disabled ? 'text-gray-400' : ''}>{o.label}</Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="mt-4">
              <Button className="premium-button w-full" onClick={() => setOpen(true)} disabled={quoteMutation.isPending}>
                {quoteMutation.isPending ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('customizer.saving')}</span>) : (t('common.getQuote'))}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('customizer.dialogTitle')}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.name || !form.phone) return; quoteMutation.mutate({ name: form.name, phone: form.phone }); }}>
            <div>
              <Label>{t('customizer.name')}</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('customizer.phone')}</Label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Button type="submit" disabled={quoteMutation.isPending || !form.name || !form.phone} className="w-full">{quoteMutation.isPending ? t('customizer.updating') : t('common.getQuote')}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
