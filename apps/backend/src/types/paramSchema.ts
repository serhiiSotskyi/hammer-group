export type PriceStrategy =
  | { type: "FIXED"; amountCents: number }
  | {
      type: "PERCENT";
      percent: number;
      base: "PRODUCT_BASE" | "RUNNING_TOTAL";
    }
  | {
      type: "PER_UNIT";
      unit: string;
      rateCents: number;
      unitsFrom?: "value" | "deltaFromDefault";
    }
  | {
      type: "PER_AREA";
      rateCents: number;
      unit: string;
      widthControlId: string;
      heightControlId: string;
      divisor?: number;
    }
  | {
      type: "THRESHOLD_FIXED";
      compare: "GT" | "GTE" | "LT" | "LTE";
      threshold: number;
      amountCents: number;
    }
  | {
      // Select different fixed amounts based on another control value (e.g., heightMm)
      type: "TIERED_BY_CONTROL";
      controlId: string; // e.g., 'heightMm'
      threshold: number; // breakpoint (e.g., 2100)
      belowAmountCents: number; // used when value <= threshold
      aboveAmountCents: number; // used when value > threshold
    };

export type ControlType = "select" | "radio" | "boolean" | "range";

interface BaseControl<T extends ControlType> {
  id: string;
  type: T;
  label: string;
  required?: boolean;
  helperText?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  priceStrategy?: PriceStrategy;
}

export interface SelectControl extends BaseControl<"select"> {
  options: ChoiceOption[];
  defaultValue?: string;
}

export interface RadioControl extends BaseControl<"radio"> {
  options: ChoiceOption[];
  defaultValue?: string;
}

export interface BooleanControl extends BaseControl<"boolean"> {
  defaultValue?: boolean;
  priceStrategy?: PriceStrategy;
}

export interface RangeControl extends BaseControl<"range"> {
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue: number;
  priceStrategy?: PriceStrategy;
}

export type Control =
  | SelectControl
  | RadioControl
  | BooleanControl
  | RangeControl;

export interface ParamSchemaGroup {
  id: string;
  label: string;
  description?: string;
  controls: Control[];
}

export interface ParamSchemaJSON {
  currency: string;
  rounding: {
    mode: "HALF_UP" | "HALF_DOWN" | "HALF_EVEN";
    minorUnit: number;
  };
  // Optional display multiplier applied to user-facing totals
  // Does not affect stored USD schema amounts
  displayMultiplier?: number;
  groups: ParamSchemaGroup[];
}

export interface PricingBreakdownEntry {
  controlId: string;
  controlLabel: string;
  groupId: string;
  groupLabel: string;
  strategy?: PriceStrategy;
  selection: unknown;
  displayValue?: string;
  deltaCents: number;
}
