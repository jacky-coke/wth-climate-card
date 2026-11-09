import type { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

export type WthClimateRowValue = "target" | "current" | "humidity" | "none";

export interface WthClimateEntityConfig {
  entity: string;
  name?: string;
  window_entity?: string;
  tap_action?: ActionConfig;
  top_value?: WthClimateRowValue;
  bottom_value?: WthClimateRowValue;
}

export interface WthClimateCardConfig extends LovelaceCardConfig {
  type: string;
  entities: WthClimateEntityConfig[];
}

export const DEFAULT_TAP_ACTION: ActionConfig = { action: "none" };
export const DEFAULT_TOP_VALUE: WthClimateRowValue = "target";
export const DEFAULT_BOTTOM_VALUE: WthClimateRowValue = "current";
export const ROW_VALUE_OPTIONS: WthClimateRowValue[] = ["target", "current", "humidity", "none"];
