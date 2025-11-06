import { createHash } from "crypto";
import {
  BooleanControl,
  ChoiceOption,
  Control,
  ParamSchemaGroup,
  ParamSchemaJSON,
  PriceStrategy,
  PricingBreakdownEntry,
  RangeControl,
  SelectControl,
} from "../types/paramSchema";

export interface ValidationIssue {
  controlId: string;
  groupId: string;
  message: string;
}

export class SelectionValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("Invalid selections");
    this.name = "SelectionValidationError";
  }
}

export interface PriceQuoteResult {
  currency: string;
  basePriceCents: number;
  adjustmentsCents: number;
  totalPriceCents: number;
  rounding: ParamSchemaJSON["rounding"];
  breakdown: PricingBreakdownEntry[];
  normalizedSelections: Record<string, unknown>;
}

type SelectionContext = {
  schema: ParamSchemaJSON;
  productBaseCents: number;
  currentTotalCents: number;
  normalizedSelections: Record<string, unknown>;
  control: Control;
  group: ParamSchemaGroup;
};

export function sha256Json(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function roundMinor(
  amountCents: number,
  mode: ParamSchemaJSON["rounding"]["mode"],
  minorUnit: number,
): number {
  if (minorUnit <= 1) {
    return roundWithMode(amountCents, mode);
  }

  const ratio = amountCents / minorUnit;
  const roundedRatio = roundWithMode(ratio, mode);
  return Math.round(roundedRatio * minorUnit);
}

function roundWithMode(value: number, mode: ParamSchemaJSON["rounding"]["mode"]): number {
  switch (mode) {
    case "HALF_DOWN":
      return roundHalfDown(value);
    case "HALF_EVEN":
      return roundHalfEven(value);
    case "HALF_UP":
    default:
      return Math.round(value);
  }
}

function roundHalfDown(value: number): number {
  const sign = Math.sign(value) || 1;
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const fraction = abs - floor;

  if (fraction > 0.5) {
    return sign * (floor + 1);
  }

  if (fraction < 0.5) {
    return sign * floor;
  }

  return sign * floor;
}

function roundHalfEven(value: number): number {
  const sign = Math.sign(value) || 1;
  const abs = Math.abs(value);
  const floor = Math.floor(abs);
  const fraction = abs - floor;

  if (fraction > 0.5) {
    return sign * (floor + 1);
  }

  if (fraction < 0.5) {
    return sign * floor;
  }

  return sign * (floor % 2 === 0 ? floor : floor + 1);
}

export function priceQuote(
  productBaseCents: number,
  schema: ParamSchemaJSON,
  selections: Record<string, unknown>,
): PriceQuoteResult {
  const issues: ValidationIssue[] = [];
  const normalizedSelections: Record<string, unknown> = {};
  const breakdown: PricingBreakdownEntry[] = [];

  let adjustmentsCents = 0;
  let currentTotalCents = productBaseCents;

  schema.groups.forEach((group) => {
    group.controls.forEach((control) => {
      try {
        const result = processControl({
          schema,
          productBaseCents,
          currentTotalCents,
          normalizedSelections,
          control,
          group,
        }, selections[control.id]);

        if (result?.skip) {
          return;
        }

        if (result) {
          normalizedSelections[control.id] = result.normalizedValue;
          if (result.breakdownEntry) {
            breakdown.push(result.breakdownEntry);
          }
          adjustmentsCents += result.deltaCents;
          currentTotalCents += result.deltaCents;
        }
      } catch (error) {
        if (error instanceof SelectionValidationError) {
          issues.push(...error.issues);
        } else {
          throw error;
        }
      }
    });
  });

  // Post-processing: derive hinges from height if a 'hinges' radio control exists
  try {
    const hingesGroup = schema.groups.find((g) => g.controls.some((c) => c.id === 'hinges'));
    const hingesCtrl = hingesGroup?.controls.find((c) => c.id === 'hinges') as SelectControl | undefined;
    const heightVal = normalizedSelections['heightMm'];
    const hasUserHinges = Object.prototype.hasOwnProperty.call(normalizedSelections, 'hinges');
    if (hingesCtrl && typeof heightVal === 'number' && !hasUserHinges) {
      // Determine count by height: <=2100 → 3, <=2300 → 4, else 5
      const count = heightVal <= 2100 ? 3 : heightVal <= 2300 ? 4 : 5;
      const optId = String(count);
      const opt = hingesCtrl.options.find((o) => o.id === optId);
      if (opt) {
        const deltaCents = calculateDelta(opt.priceStrategy, {
          schema,
          productBaseCents,
          currentTotalCents,
          normalizedSelections,
          control: (hingesCtrl as unknown) as Control,
          group: hingesGroup!,
          normalizedValue: optId,
          option: opt,
        } as any);
        normalizedSelections['hinges'] = optId;
        adjustmentsCents += deltaCents;
        currentTotalCents += deltaCents;
        breakdown.push({
          controlId: 'hinges',
          controlLabel: hingesCtrl.label || 'Hinges',
          groupId: hingesGroup!.id,
          groupLabel: hingesGroup!.label,
          selection: optId,
          displayValue: `${count}`,
          strategy: opt.priceStrategy,
          deltaCents,
        });
      }
    }
  } catch {}

  // Post-processing: hinges per-unit (hingeType × hingeCount)
  try {
    const hingesGroup = schema.groups.find((g) => g.controls.some((c) => c.id === 'hingeType' || c.id === 'hingeCount'));
    const hingeTypeCtrl = hingesGroup?.controls.find((c) => c.id === 'hingeType') as SelectControl | undefined;
    const hingeCountCtrl = hingesGroup?.controls.find((c) => c.id === 'hingeCount') as SelectControl | undefined;
    const typeSel = normalizedSelections['hingeType'];
    const countSel = normalizedSelections['hingeCount'];
    if (hingeTypeCtrl && hingeCountCtrl && typeof typeSel === 'string') {
      const opt = hingeTypeCtrl.options.find((o) => o.id === typeSel);
      const countStr = typeof countSel === 'string' ? countSel : (hingeCountCtrl.defaultValue || '3');
      const countNum = Number(countStr);
      if (opt && Number.isFinite(countNum)) {
        const deltaPerUnit = calculateDelta(opt.priceStrategy, {
          schema,
          productBaseCents,
          currentTotalCents,
          normalizedSelections,
          control: (hingeTypeCtrl as unknown) as Control,
          group: hingesGroup!,
          normalizedValue: typeSel,
          option: opt as any,
        } as any);
        const deltaTotal = deltaPerUnit * countNum;
        adjustmentsCents += deltaTotal;
        currentTotalCents += deltaTotal;
        breakdown.push({
          controlId: 'hinges',
          controlLabel: hingeTypeCtrl.label || 'Hinges',
          groupId: hingesGroup!.id,
          groupLabel: hingesGroup!.label,
          selection: `${typeSel}×${countNum}`,
          displayValue: `${typeSel} × ${countNum}`,
          strategy: opt.priceStrategy,
          deltaCents: deltaTotal,
        });
      }
    }
  } catch {}

  if (issues.length > 0) {
    throw new SelectionValidationError(issues);
  }

  const roundedAdjustments = roundMinor(
    adjustmentsCents,
    schema.rounding.mode,
    schema.rounding.minorUnit,
  );
  const totalPriceCents = productBaseCents + roundedAdjustments;

  return {
    currency: schema.currency,
    basePriceCents: productBaseCents,
    adjustmentsCents: roundedAdjustments,
    totalPriceCents,
    rounding: schema.rounding,
    breakdown,
    normalizedSelections,
  };
}

type ControlProcessResult = {
  normalizedValue: unknown;
  deltaCents: number;
  breakdownEntry?: PricingBreakdownEntry;
  skip?: boolean;
};

function processControl(
  context: SelectionContext,
  rawValue: unknown,
): ControlProcessResult | undefined {
  const { control, group } = context;

  switch (control.type) {
    case "select":
    case "radio":
      return processChoiceControl(context, rawValue as string | undefined);
    case "boolean":
      return processBooleanControl(context, rawValue);
    case "range":
      return processRangeControl(context, rawValue);
    default: {
      const exhaustiveCheck: never = control;
      throw new Error("Unsupported control type");
    }
  }
}

function processChoiceControl(
  context: SelectionContext,
  raw: string | undefined,
): ControlProcessResult {
  const control = context.control as SelectControl;
  const selection = typeof raw === "string" ? raw : control.defaultValue;
  const { group } = context;

  if (!selection) {
    if (control.required) {
      throwValidationError(control, group, "Selection required");
    }
    return { normalizedValue: null, deltaCents: 0, skip: true };
  }

  // Concealed rule: timber (wood) not allowed above 2300 mm
  const h = context.normalizedSelections['heightMm'];
  if (control.id === 'frame' && typeof h === 'number' && h > 2300 && selection === 'wood') {
    throwValidationError(control, group, 'Timber not available above 2300 mm');
  }
  // Concealed rule: hinges availability based on height
  if (control.id === 'hinges' && typeof h === 'number') {
    if (h > 2300 && (selection === '3' || selection === '4')) {
      throwValidationError(control, group, '3 and 4 hinges not available above 2300 mm');
    }
    if (h > 2100 && selection === '3') {
      throwValidationError(control, group, '3 hinges not available above 2100 mm');
    }
  }

  const option = control.options.find((opt) => opt.id === selection);
  if (!option) {
    throwValidationError(control, group, "Invalid option selected");
  }

  // If both hingeType and hingeCount exist in schema, defer hinge pricing to post-processing
  if (control.id === 'hingeType') {
    const hasCount = context.schema.groups.some((g) => g.controls.some((c) => c.id === 'hingeCount'));
    if (hasCount) {
      return { normalizedValue: selection, deltaCents: 0 };
    }
  }

  // Opening rule: Left/Right never add value
  if (control.id === 'opening' && (selection === 'left' || selection === 'right')) {
    return {
      normalizedValue: selection,
      deltaCents: 0,
      breakdownEntry: buildBreakdownEntry(context, selection, option.label, undefined, 0),
    };
  }

  // Start with option-level delta
  let deltaCents = calculateDelta(option.priceStrategy, {
    ...context,
    normalizedValue: selection,
    option,
  });
  // Apply control-level strategy too (e.g., PER_UNIT for depthMm select)
  if ((control as any).priceStrategy) {
    const ctrlStrat = (control as any).priceStrategy as any;
    let normalizedValue: unknown = selection;
    if (ctrlStrat.type === 'PER_UNIT' || ctrlStrat.type === 'THRESHOLD_FIXED') {
      const num = typeof selection === 'string' ? Number(selection) : (selection as any);
      if (!Number.isNaN(num)) normalizedValue = num;
    }
    deltaCents += calculateDelta(ctrlStrat, { ...context, normalizedValue } as any);
  }

  return {
    normalizedValue: selection,
    deltaCents,
    breakdownEntry: buildBreakdownEntry(context, selection, option.label, (control as any).priceStrategy || option.priceStrategy, deltaCents),
  };
}

function processBooleanControl(
  context: SelectionContext,
  raw: unknown,
): ControlProcessResult {
  const control = context.control as BooleanControl;
  let value: boolean;

  if (typeof raw === "boolean") {
    value = raw;
  } else if (raw === "true" || raw === "false") {
    value = raw === "true";
  } else if (raw === undefined) {
    value = control.defaultValue ?? false;
  } else {
    throwValidationError(control, context.group, "Expected boolean value");
  }

  const applyStrategy = value && control.priceStrategy;
  const deltaCents = applyStrategy
    ? calculateDelta(control.priceStrategy, { ...context, normalizedValue: value })
    : 0;

  return {
    normalizedValue: value,
    deltaCents,
    breakdownEntry: buildBreakdownEntry(context, value, value ? "Yes" : "No", control.priceStrategy, deltaCents),
  };
}

function processRangeControl(
  context: SelectionContext,
  raw: unknown,
): ControlProcessResult {
  const control = context.control as RangeControl;
  let value: number;

  if (typeof raw === "number") {
    value = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    const numeric = Number(raw);
    if (Number.isNaN(numeric)) {
      throwValidationError(control, context.group, "Value must be numeric");
    }
    value = numeric;
  } else if (raw === undefined || raw === null) {
    value = control.defaultValue;
  } else {
    throwValidationError(control, context.group, "Value must be numeric");
  }

  if (value < control.min || value > control.max) {
    throwValidationError(
      control,
      context.group,
      `Value must be between ${control.min} and ${control.max}`,
    );
  }

  if (control.step) {
    const remainder = (value - control.min) % control.step;
    if (remainder !== 0) {
      throwValidationError(
        control,
        context.group,
        `Value must increment by ${control.step}`,
      );
    }
  }

  const deltaCents = calculateDelta(control.priceStrategy, {
    ...context,
    normalizedValue: value,
  });

  return {
    normalizedValue: value,
    deltaCents,
    breakdownEntry: buildBreakdownEntry(
      context,
      value,
      control.unit ? `${value} ${control.unit}` : String(value),
      control.priceStrategy,
      deltaCents,
    ),
  };
}

function calculateDelta(
  strategy: PriceStrategy | undefined,
  context: SelectionContext & { normalizedValue: unknown; option?: ChoiceOption },
): number {
  if (!strategy) {
    return 0;
  }

  switch (strategy.type) {
    case "FIXED":
      return strategy.amountCents;
    case "PERCENT":
      return roundMinor(
        (strategy.base === "PRODUCT_BASE"
          ? context.productBaseCents
          : context.currentTotalCents) * strategy.percent,
        context.schema.rounding.mode,
        context.schema.rounding.minorUnit,
      );
    case "PER_UNIT":
      return calculatePerUnit(strategy, context);
    case "PER_AREA":
      return calculatePerArea(strategy, context);
    case "THRESHOLD_FIXED":
      return calculateThresholdFixed(strategy, context);
    case "TIERED_BY_CONTROL":
      return calculateTieredByControl(strategy, context);
    default:
      return 0;
  }
}

function calculatePerUnit(
  strategy: Extract<PriceStrategy, { type: "PER_UNIT" }> ,
  context: SelectionContext & { normalizedValue: unknown },
): number {
  const value = context.normalizedValue;
  if (typeof value !== "number") {
    return 0;
  }

  const control = context.control as RangeControl;
  const baseValue =
    strategy.unitsFrom === "deltaFromDefault"
      ? Math.abs(value - (control.defaultValue ?? 0))
      : value;

  // Support special unit TEN_MM meaning rate applies per 10 mm increment
  const units = strategy.unit === "TEN_MM" ? Math.round(baseValue / 10) : baseValue;
  return roundMinor(
    units * strategy.rateCents,
    context.schema.rounding.mode,
    context.schema.rounding.minorUnit,
  );
}

function calculatePerArea(
  strategy: Extract<PriceStrategy, { type: "PER_AREA" }>,
  context: SelectionContext,
): number {
  const widthRaw = context.normalizedSelections[strategy.widthControlId];
  const heightRaw = context.normalizedSelections[strategy.heightControlId];

  if (typeof widthRaw !== "number" || typeof heightRaw !== "number") {
    return 0;
  }

  const area = widthRaw * heightRaw;
  const divisor = strategy.divisor ?? 1;
  const normalizedArea = area / divisor;

  return roundMinor(
    normalizedArea * strategy.rateCents,
    context.schema.rounding.mode,
    context.schema.rounding.minorUnit,
  );
}

function calculateThresholdFixed(
  strategy: Extract<PriceStrategy, { type: "THRESHOLD_FIXED" }>,
  context: SelectionContext & { normalizedValue: unknown },
): number {
  const value = context.normalizedValue;
  if (typeof value !== "number") return 0;
  const t = strategy.threshold;
  const v = value;
  let condition = false;
  switch (strategy.compare) {
    case "GT": condition = v > t; break;
    case "GTE": condition = v >= t; break;
    case "LT": condition = v < t; break;
    case "LTE": condition = v <= t; break;
  }
  return condition ? strategy.amountCents : 0;
}

function calculateTieredByControl(
  strategy: Extract<PriceStrategy, { type: "TIERED_BY_CONTROL" }>,
  context: SelectionContext & { normalizedValue: unknown },
): number {
  const refRaw = context.normalizedSelections[strategy.controlId];
  const refVal = typeof refRaw === 'number' ? refRaw : (typeof refRaw === 'string' ? Number(refRaw) : NaN);
  if (!Number.isFinite(refVal)) return 0;
  const useAbove = refVal > strategy.threshold;
  const cents = useAbove ? strategy.aboveAmountCents : strategy.belowAmountCents;
  return roundMinor(
    cents,
    context.schema.rounding.mode,
    context.schema.rounding.minorUnit,
  );
}

function buildBreakdownEntry(
  context: SelectionContext,
  selection: unknown,
  displayValue: string,
  strategy: PriceStrategy | undefined,
  deltaCents: number,
): PricingBreakdownEntry {
  return {
    controlId: context.control.id,
    controlLabel: context.control.label,
    groupId: context.group.id,
    groupLabel: context.group.label,
    selection,
    displayValue,
    strategy,
    deltaCents,
  };
}

function throwValidationError(control: Control, group: ParamSchemaGroup, message: string): never {
  throw new SelectionValidationError([
    {
      controlId: control.id,
      groupId: group.id,
      message,
    },
  ]);
}
