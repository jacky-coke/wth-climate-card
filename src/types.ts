import type { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

// The string & {} trick keeps IntelliSense for the three known values while still
// allowing arbitrary free text (e.g. a literal "-" separator chip).
export type WthClimateRowValue = "target" | "current" | "humidity" | (string & {});

export interface WthClimateEntityConfig {
  entity: string;
  name?: string;
  /** @deprecated superseded by window_entities (array); kept for reading old configs */
  window_entity?: string;
  /** Window (or door) sensors; the icon shows whenever ANY of them is "on". */
  window_entities?: string[];
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
  /**
   * Scales the thermostat display's text and icons relative to the built-in
   * default (1). Not exposed in the visual editor — set it via YAML/the code
   * editor, e.g. `font_scale: 0.75` for smaller text. Must be > 0.
   */
  font_scale?: number;
  /**
   * Caps the card's own width in pixels, so it doesn't stretch to fill a wide
   * dashboard grid column/section. Not exposed in the visual editor — set it
   * via YAML/the code editor. Must be > 0. Default: 344 (the thermostat
   * graphic's own 320px cap plus the card's padding).
   */
  max_width?: number;
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

export const DEFAULT_FONT_SCALE = 1;

/** Resolves the card-wide font scale, falling back to the default for an invalid/missing value. */
export function resolveFontScale(config: WthClimateCardConfig): number {
  const value = config.font_scale;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : DEFAULT_FONT_SCALE;
}

export const DEFAULT_MAX_WIDTH = 344;

/** Resolves the card's own max width (px), falling back to the default for an invalid/missing value. */
export function resolveMaxWidth(config: WthClimateCardConfig): number {
  const value = config.max_width;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_WIDTH;
}

/** Resolves the effective window sensor list for a room, handling the old single-entity config. */
export function resolveWindowEntities(entity: WthClimateEntityConfig): string[] {
  const list = entity.window_entities ? [...entity.window_entities] : [];
  if (entity.window_entity && !list.includes(entity.window_entity)) {
    list.unshift(entity.window_entity);
  }
  return list;
}
