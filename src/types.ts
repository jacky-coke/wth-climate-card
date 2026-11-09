import type { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

export type WthClimateRowValue = "target" | "current" | "humidity";

export interface WthClimateEntityConfig {
  entity: string;
  name?: string;
  window_entity?: string;
  tap_action?: ActionConfig;
  /** @deprecated superseded by top_values (array); kept for reading old configs */
  top_value?: WthClimateRowValue;
  /** @deprecated superseded by bottom_values (array); kept for reading old configs */
  bottom_value?: WthClimateRowValue;
  top_values?: WthClimateRowValue[];
  bottom_values?: WthClimateRowValue[];
}

export interface WthClimateCardConfig extends LovelaceCardConfig {
  type: string;
  entities: WthClimateEntityConfig[];
}

export const DEFAULT_TAP_ACTION: ActionConfig = { action: "none" };
export const DEFAULT_TOP_VALUES: WthClimateRowValue[] = ["target"];
export const DEFAULT_BOTTOM_VALUES: WthClimateRowValue[] = ["current"];
export const ROW_VALUE_OPTIONS: WthClimateRowValue[] = ["target", "current", "humidity"];

/** Resolves the effective top-row values for a room, handling old single-value configs. */
export function resolveTopValues(entity: WthClimateEntityConfig): WthClimateRowValue[] {
  if (entity.top_values) return entity.top_values;
  if (entity.top_value) return [entity.top_value];
  return DEFAULT_TOP_VALUES;
}

/** Resolves the effective bottom-row values for a room, handling old single-value configs. */
export function resolveBottomValues(entity: WthClimateEntityConfig): WthClimateRowValue[] {
  if (entity.bottom_values) return entity.bottom_values;
  if (entity.bottom_value) return [entity.bottom_value];
  return DEFAULT_BOTTOM_VALUES;
}
