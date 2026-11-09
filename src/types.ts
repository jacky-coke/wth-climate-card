import type { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

// The string & {} trick keeps IntelliSense for the three known values while still
// allowing arbitrary free text (e.g. a literal "-" separator chip).
export type WthClimateRowValue = "target" | "current" | "humidity" | (string & {});

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
  /** Joins multiple values within a row. Defaults to DEFAULT_SEPARATOR. */
  separator?: string;
}

export interface WthClimateCardConfig extends LovelaceCardConfig {
  type: string;
  entities: WthClimateEntityConfig[];
}

export const DEFAULT_TAP_ACTION: ActionConfig = { action: "none" };
// "temperature"/"current_temperature"/"current_humidity" are the climate entity's own
// attribute names, matching what HA's native ui_state_content picker offers.
export const DEFAULT_TOP_VALUES: WthClimateRowValue[] = ["temperature"];
export const DEFAULT_BOTTOM_VALUES: WthClimateRowValue[] = ["current_temperature"];

export const DEFAULT_SEPARATOR = " · ";
export const SEPARATOR_OPTIONS: string[] = [" · ", " - ", " ", " * ", " / "];

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

/** Resolves the effective separator for a room, falling back to the default. */
export function resolveSeparator(entity: WthClimateEntityConfig): string {
  return entity.separator ?? DEFAULT_SEPARATOR;
}
