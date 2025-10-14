"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';
import { formatCurrencyByLang } from '@/lib/format';
import { getProducts, resolveImageUrl, getInteriorSchema, priceInteriorQuote, createInteriorQuote } from "@/services/api";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PRODUCT_SLUG = "classic-oak";

export default function InteriorCustomizer({ productSlug = DEFAULT_PRODUCT_SLUG }: { productSlug?: string }) {
  const { t, i18n } = useTranslation();
  const productQuery = useQuery({
    queryKey: ["interior", "product", productSlug],
    queryFn: async () => {
      const products = await getProducts({ slug: productSlug });
      return products[0];
    },
    enabled: Boolean(productSlug),
  });
  const schemaQuery = useQuery({ queryKey: ["interior", "schema"], queryFn: getInteriorSchema });
  const { toast } = useToast();

  const [selection, setSelection] = useState<string | null>(null);
  const [casingFront, setCasingFront] = useState<string | null>(null);
  const [casingInner, setCasingInner] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [finishCoat, setFinishCoat] = useState<string | null>(null);
  const [heightMm, setHeightMm] = useState<number | null>(null);
  const [widthMm, setWidthMm] = useState<number | null>(null);
  const [depthMm, setDepthMm] = useState<number | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const schemaDoorBlock = schemaQuery.data?.schema?.groups?.find((g: any) => g.id === 'doorBlock');
  const doorBlockControl = schemaDoorBlock?.controls?.find((c: any) => c.id === 'doorBlock');
  const schemaCasings = schemaQuery.data?.schema?.groups?.find((g: any) => g.id === 'casings');
  const casingFrontControl = schemaCasings?.controls?.find((c: any) => c.id === 'casingFront');
  const casingInnerControl = schemaCasings?.controls?.find((c: any) => c.id === 'casingInner');
  const schemaSizes = schemaQuery.data?.schema?.groups?.find((g: any) => g.id === 'sizes');
  const heightControl = schemaSizes?.controls?.find((c: any) => c.id === 'heightMm');
  const widthControl = schemaSizes?.controls?.find((c: any) => c.id === 'widthMm');
  const depthControl = schemaSizes?.controls?.find((c: any) => c.id === 'depthMm');
  const schemaOpening = schemaQuery.data?.schema?.groups?.find((g: any) => g.id === 'opening');
  const openingControl = schemaOpening?.controls?.find((c: any) => c.id === 'opening');
  const schemaFinish = schemaQuery.data?.schema?.groups?.find((g: any) => g.id === 'finishCoat');
  const finishControl = schemaFinish?.controls?.find((c: any) => c.id === 'finishCoat');

  useEffect(() => {
    if (doorBlockControl && !selection) {
      setSelection(doorBlockControl.defaultValue || doorBlockControl.options?.[0]?.id || null);
    }
    if (casingFrontControl && !casingFront) {
      setCasingFront(casingFrontControl.defaultValue || casingFrontControl.options?.[0]?.id || null);
    }
    if (casingInnerControl && !casingInner) {
      setCasingInner(casingInnerControl.defaultValue || casingInnerControl.options?.[0]?.id || null);
    }
    if (heightControl && heightMm == null) setHeightMm(heightControl.defaultValue);
    if (widthControl && widthMm == null) setWidthMm(widthControl.defaultValue);
    if (depthControl && depthMm == null) setDepthMm(depthControl.defaultValue);
    if (openingControl && !opening) setOpening(openingControl.defaultValue || openingControl.options?.[0]?.id || null);
    if (finishControl && !finishCoat) setFinishCoat(finishControl.defaultValue || finishControl.options?.[0]?.id || null);
  }, [doorBlockControl?.defaultValue, doorBlockControl?.options, selection, casingFrontControl?.defaultValue, casingFrontControl?.options, casingFront, casingInnerControl?.defaultValue, casingInnerControl?.options, casingInner, heightControl, widthControl, depthControl, heightMm, widthMm, depthMm, openingControl, opening, finishControl, finishCoat]);

  const clampToStep = (val: number, min: number, max: number, step: number) => {
    const clamped = Math.min(max, Math.max(min, val));
    const offset = clamped - min;
    const snapped = Math.round(offset / step) * step + min;
    return Math.min(max, Math.max(min, snapped));
  };

  const allowedMinMax = (ctrl: any) => {
    if (!ctrl) return { min: 0, max: 0, step: 10, def: 0 };
    const step = ctrl.step || 10;
    const def = ctrl.defaultValue ?? ctrl.min;
    // Use schema's min/max exactly as provided
    const min = ctrl.min;
    const max = ctrl.max;
    return { min, max, step, def };
  };

  const priceQuery = useQuery({
    queryKey: [
      "interior",
      "price",
      productSlug,
      schemaQuery.data?.checksum,
      selection,
      casingFront,
      casingInner,
      opening,
      finishCoat,
      heightMm,
      widthMm,
      depthMm,
    ],
    queryFn: () => priceInteriorQuote(productSlug, {
      ...(selection ? { doorBlock: selection } : {}),
      ...(casingFront ? { casingFront } : {}),
      ...(casingInner ? { casingInner } : {}),
      ...(heightMm != null ? { heightMm } : {}),
      ...(widthMm != null ? { widthMm } : {}),
      ...(depthMm != null ? { depthMm } : {}),
      ...(opening ? { opening } : {}),
      ...(finishCoat ? { finishCoat } : {}),
    }),
    enabled: Boolean(productSlug && schemaQuery.data?.checksum && selection),
    refetchOnWindowFocus: false,
  });

  const selectionsPayload = {
    ...(selection ? { doorBlock: selection } : {}),
    ...(casingFront ? { casingFront } : {}),
    ...(casingInner ? { casingInner } : {}),
    ...(opening ? { opening } : {}),
    ...(finishCoat ? { finishCoat } : {}),
    ...(heightMm != null ? { heightMm } : {}),
    ...(widthMm != null ? { widthMm } : {}),
    ...(depthMm != null ? { depthMm } : {}),
  } as Record<string, unknown>;

  const quoteMutation = useMutation({
    mutationFn: async () => {
      return createInteriorQuote(productSlug, selectionsPayload, { name: form.name, phone: form.phone });
    },
    onSuccess: () => {
      toast({ title: t('customizer.quoteSavedTitle'), description: t('customizer.quoteSavedDesc') });
      setQuoteOpen(false);
    },
    onError: (err: unknown) => {
      toast({ title: t('customizer.quoteFailedTitle'), description: err instanceof Error ? err.message : t('customizer.quoteFailedDesc'), variant: 'destructive' });
    }
  });

  // Ensure instant price recompute when any selection changes
  useEffect(() => {
    if (productSlug && schemaQuery.data?.checksum && selection) {
      priceQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, casingFront, casingInner, opening, finishCoat, heightMm, widthMm, depthMm]);

  if (productQuery.isLoading) {
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
  if (!product) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          {t('customizer.unable')}
        </div>
      </section>
    );
  }

  return (
    <section id="customizer" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary mb-6">{t('customizer.interiorTitle')}</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{t('customizer.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">{t('customizer.preview')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={resolveImageUrl(product.imageUrl) || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/placeholder.svg"; }}
                  />
                </div>
                <div className="p-4 bg-primary/5 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('common.basePrice')}</span>
                    <span className="font-medium">
                      {formatCurrencyByLang(product.convertedPriceCents ?? product.basePriceCents, product.currency ?? 'UAH', i18n.language)}
                    </span>
                  </div>
                  {priceQuery.data && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('common.adjustments')}</span>
                      <span className="font-medium">{formatCurrencyByLang(priceQuery.data.adjustmentsCents, priceQuery.data.currency, i18n.language)}</span>
                    </div>
                  )}
                  {priceQuery.data && (
                    <div className="flex items-center justify-between border-t border-primary/20 pt-3">
                      <span className="text-sm text-muted-foreground">{t('common.total')}</span>
                      <span className="font-semibold">{formatCurrencyByLang(priceQuery.data.totalPriceCents, priceQuery.data.currency, i18n.language)}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('common.priceNote')}</p>
                </div>
              </CardContent>
            </Card>

            {priceQuery.data?.breakdown?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('customizer.priceBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {priceQuery.data.breakdown
                    .filter((line) => {
                      // Only show groups/controls present in the UI and exclude legacy 'dimensions'
                      const allowedGroups = new Set(['doorBlock','casings','sizes','opening','finishCoat']);
                      const allowedControls = new Set(['doorBlock','casingFront','casingInner','heightMm','widthMm','depthMm','opening','finishCoat']);
                      return allowedGroups.has(line.groupId) && allowedControls.has(line.controlId);
                    })
                    .map((line) => (
                    <div key={`${line.groupId}-${line.controlId}-${String(line.selection)}`} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t(`schema.controls.${line.controlId}`, { defaultValue: line.controlLabel })}</p>
                        <p className="text-xs text-muted-foreground">{String(line.displayValue ?? line.selection)}</p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrencyByLang(line.deltaCents, priceQuery.data.currency, i18n.language)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('schema.groups.doorBlock', { defaultValue: 'Door Block' })}</CardTitle>
              </CardHeader>
              <CardContent>
                {doorBlockControl ? (
                  <div className="space-y-3">
                    <Label>{t('schema.controls.doorBlock', { defaultValue: doorBlockControl.label })}</Label>
                    <RadioGroup value={selection ?? ''} onValueChange={setSelection}>
                      {doorBlockControl.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt.id} id={`doorBlock-${opt.id}`} />
                          <Label htmlFor={`doorBlock-${opt.id}`} className="font-normal">
                            {t(`schema.options.doorBlock.${opt.id}`, { defaultValue: opt.label })}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('customizer.updating')}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('schema.groups.casings', { defaultValue: 'Door Casings' })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {casingFrontControl && (
                  <div className="space-y-3">
                    <Label>{t('schema.controls.casingFront', { defaultValue: casingFrontControl.label })}</Label>
                    <RadioGroup value={casingFront ?? ''} onValueChange={setCasingFront}>
                      {casingFrontControl.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt.id} id={`casingFront-${opt.id}`} />
                          <Label htmlFor={`casingFront-${opt.id}`} className="font-normal">
                            {t(`schema.options.casing.${opt.id}`, { defaultValue: opt.label })}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
                {casingInnerControl && (
                  <div className="space-y-3">
                    <Label>{t('schema.controls.casingInner', { defaultValue: casingInnerControl.label })}</Label>
                    <RadioGroup value={casingInner ?? ''} onValueChange={setCasingInner}>
                      {casingInnerControl.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt.id} id={`casingInner-${opt.id}`} />
                          <Label htmlFor={`casingInner-${opt.id}`} className="font-normal">
                            {t(`schema.options.casing.${opt.id}`, { defaultValue: opt.label })}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>

            {schemaSizes && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('schema.groups.sizes', { defaultValue: 'Sizes' })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {heightControl && (() => {
                    const { min, max, step, def } = allowedMinMax(heightControl);
                    return (
                      <div className="space-y-1">
                        <Label>{t('schema.controls.heightMm', { defaultValue: heightControl.label })}</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          step={step}
                          min={min}
                          max={max}
                          value={heightMm ?? def}
                          onChange={(e) => setHeightMm(clampToStep(Number(e.target.value || def), min, max, step))}
                        />
                        <p className="text-xs text-muted-foreground">{min}–{max} mm, step {step} mm</p>
                      </div>
                    );
                  })()}
                  {widthControl && (() => {
                    const { min, max, step, def } = allowedMinMax(widthControl);
                    return (
                      <div className="space-y-1">
                        <Label>{t('schema.controls.widthMm', { defaultValue: widthControl.label })}</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          step={step}
                          min={min}
                          max={max}
                          value={widthMm ?? def}
                          onChange={(e) => setWidthMm(clampToStep(Number(e.target.value || def), min, max, step))}
                        />
                        <p className="text-xs text-muted-foreground">{min}–{max} mm, step {step} mm</p>
                      </div>
                    );
                  })()}
                  {depthControl && (() => {
                    const { min, max, step, def } = allowedMinMax(depthControl);
                    return (
                      <div className="space-y-1">
                        <Label>{t('schema.controls.depthMm', { defaultValue: depthControl.label })}</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          step={step}
                          min={min}
                          max={max}
                          value={depthMm ?? def}
                          onChange={(e) => setDepthMm(clampToStep(Number(e.target.value || def), min, max, step))}
                        />
                        <p className="text-xs text-muted-foreground">{min}–{max} mm, step {step} mm</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {openingControl && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('schema.groups.opening', { defaultValue: 'Opening' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label>{t('schema.controls.opening', { defaultValue: openingControl.label })}</Label>
                    <RadioGroup value={opening ?? ''} onValueChange={setOpening}>
                      {openingControl.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt.id} id={`opening-${opt.id}`} />
                          <Label htmlFor={`opening-${opt.id}`} className="font-normal">
                            {t(`schema.options.opening.${opt.id}`, { defaultValue: opt.label })}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            )}

            {finishControl && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('schema.groups.finishCoat', { defaultValue: 'Finish coat' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label>{t('schema.controls.finishCoat', { defaultValue: finishControl.label })}</Label>
                    <RadioGroup value={finishCoat ?? ''} onValueChange={setFinishCoat}>
                      {finishControl.options?.map((opt: any) => (
                        <div key={opt.id} className="flex items-center space-x-3">
                          <RadioGroupItem value={opt.id} id={`finishCoat-${opt.id}`} />
                          <Label htmlFor={`finishCoat-${opt.id}`} className="font-normal">
                            {t(`schema.options.finishCoat.${opt.id}`, { defaultValue: opt.label })}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="pt-2">
              <Button
                className="w-full premium-button py-4 text-base"
                onClick={() => setQuoteOpen(true)}
                disabled={quoteMutation.isPending}
              >
                {quoteMutation.isPending ? t('customizer.saving') : t('customizer.sendQuote')}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t('customizer.unable') === 'Unable to load customizer at the moment.' ? '' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('customizer.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name || !form.phone) return;
              quoteMutation.mutate();
            }}
          >
            <div>
              <Label>{t('customizer.name')}</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('customizer.phone')}</Label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={quoteMutation.isPending || !form.name || !form.phone}>
              {quoteMutation.isPending ? t('customizer.sending') : t('customizer.sendQuote')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
