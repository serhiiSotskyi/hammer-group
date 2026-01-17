"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyByLang } from '@/lib/format';
import { createInteriorQuote, getInteriorSchema, getProducts, priceInteriorQuote, resolveImageUrl } from "@/services/api";
import { ParamSchemaJSON, SelectControl } from "@/types/paramSchema";

const DEFAULT_PRODUCT_SLUG = "classic-oak";

export default function InteriorCustomizerV2({ productSlug = DEFAULT_PRODUCT_SLUG }: { productSlug?: string }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const productQuery = useQuery({
    queryKey: ["interior-v2", "product", productSlug],
    queryFn: async () => (await getProducts({ slug: productSlug }))[0],
    enabled: Boolean(productSlug),
  });
  const schemaQuery = useQuery({ queryKey: ["interior-v2", "schema"], queryFn: getInteriorSchema });

  const schema = schemaQuery.data?.schema as ParamSchemaJSON | undefined;
  const find = (groupId: string, controlId: string) => {
    const g = schema?.groups.find((g) => g.id === groupId);
    return g?.controls.find((c) => c.id === controlId) as SelectControl | undefined;
  };

  const heightCtrl = find('sizes','heightMm');
  const widthCtrl = find('sizes','widthMm');
  const depthCtrl = find('sizes','depthMm');
  const openingCtrl = find('opening','opening');
  const frameCtrl = find('frame','frameType');
  const lockCtrl = find('lock','lockType');
  const casingOuterCtrl = find('casings','casingOuter');
  const casingInnerCtrl = find('casings','casingInner');
  const hingeTypeCtrl = find('hinges','hingeType');
  const hingeCountCtrl = find('hinges','hingeCount');
  const stopperCtrl = find('stopper','stopper');
  const edgeCtrl = find('edge','edgeColor');
  const finishCtrl = find('finishCoat','finishCoat');

  const [sel, setSel] = useState<Record<string, string>>({});
  const setVal = (id: string, v: string) => setSel((p) => ({ ...p, [id]: v }));

  // Initialize defaults
  useEffect(() => {
    if (!schema) return;
    const init: Record<string,string> = {};
    const useDef = (c?: SelectControl) => c?.defaultValue && (init[c.id] = String(c.defaultValue));
    [heightCtrl,widthCtrl,depthCtrl,openingCtrl,frameCtrl,lockCtrl,casingOuterCtrl,casingInnerCtrl,hingeTypeCtrl,hingeCountCtrl,stopperCtrl,edgeCtrl,finishCtrl].forEach(useDef);
    setSel((p) => ({ ...init, ...p }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaQuery.data?.checksum]);

  // UI rules
  const heightNum = useMemo(() => Number(sel.heightMm ?? heightCtrl?.defaultValue ?? 2000), [sel.heightMm, heightCtrl?.defaultValue]);
  // Hinges min rules
  useEffect(() => {
    if (!hingeCountCtrl) return;
    const min = heightNum > 2300 ? 5 : heightNum > 2100 ? 4 : 3;
    const count = Number(sel.hingeCount ?? hingeCountCtrl.defaultValue ?? 3);
    if (count < min) setVal('hingeCount', String(min));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightNum, hingeCountCtrl?.defaultValue]);
  // When any inside variant is active, keep hinge type hidden; do not auto-revert on exit
  useEffect(() => {
    const inside = (sel.opening === 'leftInside' || sel.opening === 'rightInside' || sel.frameType === 'inside');
    if (inside && hingeTypeCtrl && sel.hingeType !== 'hidden') setVal('hingeType', 'hidden');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.opening, sel.frameType]);

  // Price query
  const priceQuery = useQuery({
    queryKey: ["interior-v2", "price", productSlug, schemaQuery.data?.checksum, sel],
    queryFn: () => priceInteriorQuote(productSlug!, sel),
    enabled: Boolean(productSlug && schemaQuery.data?.checksum && Object.keys(sel).length > 0),
    refetchOnWindowFocus: false,
  });

  // Quote dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const quote = useMutation({
    mutationFn: () => createInteriorQuote(productSlug!, sel, form),
    onSuccess: () => { toast({ title: t('customizer.quoteSavedTitle'), description: t('customizer.quoteSavedDesc') }); setOpen(false); },
    onError: (e: unknown) => toast({ title: t('customizer.quoteFailedTitle'), description: e instanceof Error ? e.message : t('customizer.quoteFailedDesc'), variant: 'destructive' }),
  });

  // Define values and hooks used later BEFORE any early returns to keep hook order stable
  const currency = 'UAH';
  const price = priceQuery.data;
  const displayedLines = useMemo(() => {
    if (!price?.breakdown) return [] as typeof price.breakdown;
    const allowed = new Set(['heightMm','widthMm','depthMm','opening','frameType','lockType','casingOuter','casingInner','hinges','stopper','edgeColor','finishCoat']);
    const reduced: Record<string, (typeof price.breakdown)[number]> = {} as any;
    for (const line of price.breakdown) {
      if (!allowed.has(line.controlId)) continue;
      const prev = reduced[line.controlId];
      if (!prev) { reduced[line.controlId] = line; continue; }
      const prevAbs = Math.abs(prev.deltaCents);
      const curAbs = Math.abs(line.deltaCents);
      if (curAbs > prevAbs) reduced[line.controlId] = line;
    }
    return Object.values(reduced);
  }, [price?.breakdown]);
  const uiAdjustmentsCents = useMemo(() => displayedLines.reduce((s, l) => s + l.deltaCents, 0), [displayedLines]);

  if (productQuery.isLoading || schemaQuery.isLoading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <Skeleton className="h-10 w-64 mx-auto mb-10" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </section>
    );
  }
  const product = productQuery.data;
  if (!product || !schema) {
    return <section className="py-20 bg-background"><div className="container mx-auto px-6 text-center text-muted-foreground">{t('customizer.unable')}</div></section>;
  }

  const renderSelect = (ctrl?: SelectControl, id?: string) => {
    if (!ctrl) return null;
    const cid = id || ctrl.id;
    const value = sel[cid] ?? String(ctrl.defaultValue ?? '');
    // Custom change handlers for coupling of opening/frameType
    const onChange = (v: string) => {
      if (cid === 'opening') {
        setSel((prev) => {
          const next = { ...prev, opening: v } as Record<string,string>;
          const isInside = v === 'leftInside' || v === 'rightInside';
          if (isInside) {
            next.frameType = 'inside';
            if (hingeTypeCtrl) next.hingeType = 'hidden';
          } else if (prev.frameType === 'inside') {
            next.frameType = 'standard';
          }
          return next;
        });
        return;
      }
      if (cid === 'frameType') {
        setSel((prev) => {
          const next = { ...prev, frameType: v } as Record<string,string>;
          if (v === 'inside') {
            if (prev.opening === 'left') next.opening = 'leftInside';
            else if (prev.opening === 'right') next.opening = 'rightInside';
            if (hingeTypeCtrl) next.hingeType = 'hidden';
          } else {
            if (prev.opening === 'leftInside') next.opening = 'left';
            else if (prev.opening === 'rightInside') next.opening = 'right';
          }
          return next;
        });
        return;
      }
      setVal(cid, v);
    };
    return (
      <div className="space-y-1">
        <Label>{t(`schema.controls.${cid}`, { defaultValue: ctrl.label })}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={ctrl.label} /></SelectTrigger>
          <SelectContent>
            {ctrl.options.map((o) => {
              // Disable hinge count options that are below the min allowed by height
              const disableByHeight = cid === 'hingeCount' ? (() => {
                const minAllowed = heightNum > 2300 ? 5 : (heightNum > 2100 ? 4 : 3);
                const n = Number(o.id);
                return Number.isFinite(n) && n < minAllowed;
              })() : false;
              const optLabel = t(`schema.options.${cid}.${o.id}`, { defaultValue: o.label });
              return (<SelectItem key={o.id} value={o.id} disabled={disableByHeight}>{optLabel}</SelectItem>);
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <section id="customizer" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">{t('customizer.interiorTitle')}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('customizer.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: preview + totals + breakdown */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader><CardTitle>{t('customizer.preview')}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                  <img src={resolveImageUrl(product.imageUrl) || "/placeholder.svg"} alt={product.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/placeholder.svg"; }} />
                </div>
                <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('common.basePrice')}</span><span className="font-medium">{formatCurrencyByLang(price?.basePriceCents ?? product.basePriceCents, currency, i18n.language)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{t('common.adjustments')}</span><span className="font-medium">{price ? formatCurrencyByLang(uiAdjustmentsCents, currency, i18n.language) : "--"}</span></div>
                  <div className="flex items-center justify-between border-t border-primary/20 pt-3"><span className="text-sm text-muted-foreground">{t('common.total')}</span><span className="font-semibold">{price ? formatCurrencyByLang((price.basePriceCents ?? 0) + uiAdjustmentsCents, currency, i18n.language) : t('customizer.updating')}</span></div>
                  <p className="text-xs text-muted-foreground">{t('common.priceNote')}</p>
                </div>
              </CardContent>
            </Card>
            {price?.breakdown?.length ? (
              <Card>
                <CardHeader><CardTitle>{t('customizer.priceBreakdown')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {displayedLines.map((line) => (
                    <div key={`${line.groupId}-${line.controlId}-${String(line.selection)}`} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t(`schema.controls.${line.controlId}`, { defaultValue: line.controlLabel })}</p>
                        <p className="text-xs text-muted-foreground">{String(line.displayValue ?? line.selection)}</p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrencyByLang(line.deltaCents, currency, i18n.language)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
          {/* Right: controls */}
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>{t('schema.groups.sizes', { defaultValue: 'Розміри' })}</CardTitle></CardHeader><CardContent className="space-y-3">{renderSelect(heightCtrl)}{renderSelect(widthCtrl)}{renderSelect(depthCtrl)}</CardContent></Card>
            <Card><CardHeader><CardTitle>{t('schema.groups.opening', { defaultValue: 'Відкривання' })}</CardTitle></CardHeader><CardContent>{renderSelect(openingCtrl)}</CardContent></Card>
            <Card><CardHeader><CardTitle>{t('schema.groups.frame', { defaultValue: 'Короб' })}</CardTitle></CardHeader><CardContent>{renderSelect(frameCtrl,'frameType')}</CardContent></Card>
            <Card><CardHeader><CardTitle>{t('schema.groups.lock', { defaultValue: 'Замок' })}</CardTitle></CardHeader><CardContent>{renderSelect(lockCtrl)}</CardContent></Card>
            <Card>
              <CardHeader><CardTitle>{t('schema.groups.casings', { defaultValue: 'Лиштва' })}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderSelect(casingOuterCtrl)}
                  {renderSelect(casingInnerCtrl)}
                </div>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>{t('schema.groups.hinges', { defaultValue: 'Петлі' })}</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderSelect(hingeTypeCtrl)}{renderSelect(hingeCountCtrl)}</CardContent></Card>
            <Card><CardHeader><CardTitle>{t('schema.groups.stopper', { defaultValue: 'Стопор' })}</CardTitle></CardHeader><CardContent>{renderSelect(stopperCtrl)}</CardContent></Card>
            <Card><CardHeader><CardTitle>{t('schema.groups.edge', { defaultValue: 'Торець' })}</CardTitle></CardHeader><CardContent>{renderSelect(edgeCtrl)}</CardContent></Card>
            <Card>
              <CardHeader><CardTitle>{t('schema.groups.finishCoat', { defaultValue: 'Покриття' })}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">ПВХ</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="max-w-xl mx-auto mt-8">
          <Button className="w-full premium-button py-4 text-base" onClick={() => setOpen(true)} disabled={quote.isPending}>{quote.isPending ? t('customizer.saving') : t('customizer.sendQuote')}</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('customizer.dialogTitle')}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!form.name || !form.phone) return; quote.mutate(); }}>
            <div><Label>{t('customizer.name')}</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t('customizer.phone')}</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={quote.isPending || !form.name || !form.phone}>{quote.isPending ? t('customizer.sending') : t('customizer.sendQuote')}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
