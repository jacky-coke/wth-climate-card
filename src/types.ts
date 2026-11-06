import type { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

export interface WthClimateEntityConfig {
  entity: string;
  name?: string;
  window_entity?: string;
  tap_action?: ActionConfig;
}

export interface WthClimateCardConfig extends LovelaceCardConfig {
  type: string;
  entities: WthClimateEntityConfig[];
}

export const DEFAULT_TAP_ACTION: ActionConfig = { action: "none" };
