import { LitElement, html, css, unsafeCSS, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardEditor,
  handleAction,
  hasAction,
  fireEvent
} from "custom-card-helpers";
import {
  WthClimateCardConfig,
  WthClimateEntityConfig,
  WthClimateRowValue,
  DEFAULT_TAP_ACTION,
  resolveTopValues,
  resolveBottomValues,
  resolveSeparator,
  resolveFontScale,
  resolveMaxWidth,
  resolveWindowEntities
} from "./types";
import { localize } from "./localize";
import { WTH2_IMAGE } from "./assets/wth2-datauri";

import "./wth-climate-card-editor";

const CARD_VERSION = "0.1.0";

// eslint-disable-next-line no-console
console.info(
  `%c WTH-CLIMATE-CARD %c v${CARD_VERSION} `,
  "color: white; background: #2b2f33; font-weight: 700;",
  "color: #2b2f33; background: white; font-weight: 700;"
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "wth-climate-card",
  name: "WTH Climate Card",
  description:
    "A universal climate control card styled after a wall thermostat display. Works with any climate.* entity.",
  preview: false
});

function fmtTemp(value: number | null | undefined, step: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  const decimals = step < 1 ? 1 : 0;
  return `${value.toFixed(decimals)}°`;
}

function fmtHumidity(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return `${Math.round(value)}%`;
}

function fmtDateTime(value: string | undefined): string {
  if (!value) return "–";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "–" : d.toLocaleString();
}

function fmtRowValue(
  kind: WthClimateRowValue,
  stateObj: any,
  target: number | undefined,
  current: number | undefined,
  humidity: number | undefined,
  step: number
): string {
  switch (kind) {
    // "temperature"/"current_temperature"/"current_humidity" are the climate
    // entity's real attribute names, as offered by HA's native state-content
    // picker. "target"/"current"/"humidity" are kept for configs saved by the
    // card's earlier hand-rolled row-value picker.
    case "temperature":
    case "target":
      return fmtTemp(target, step);
    case "current_temperature":
    case "current":
      return fmtTemp(current, step);
    case "current_humidity":
    case "humidity":
      return fmtHumidity(humidity);
    case "state":
      return stateObj?.state ?? "–";
    case "last_changed":
      return fmtDateTime(stateObj?.last_changed);
    case "last_updated":
      return fmtDateTime(stateObj?.last_updated);
    default: {
      // Any other attribute name picked from the native picker (e.g. "hvac_action").
      if (stateObj?.attributes && kind in stateObj.attributes) {
        const value = stateObj.attributes[kind];
        return value === null || value === undefined ? "–" : String(value);
      }
      // Not a known key or live attribute: treat as literal free text (e.g. "-").
      return kind;
    }
  }
}

function fmtRow(
  kinds: WthClimateRowValue[],
  stateObj: any,
  target: number | undefined,
  current: number | undefined,
  humidity: number | undefined,
  step: number,
  separator: string
): string {
  return kinds
    .map((kind) => fmtRowValue(kind, stateObj, target, current, humidity, step))
    .filter((v) => v !== "")
    .join(separator);
}

@customElement("wth-climate-card")
export class WthClimateCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WthClimateCardConfig;

  @state() private _activeIndex = 0;

  @state() private _errorMessage?: string;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./wth-climate-card-editor");
    return document.createElement("wth-climate-card-editor") as LovelaceCardEditor;
  }

  public static getStubConfig(hass: HomeAssistant): WthClimateCardConfig {
    const firstClimate = Object.keys(hass.states).find((e) => e.startsWith("climate."));
    return {
      type: "custom:wth-climate-card",
      entities: firstClimate ? [{ entity: firstClimate }] : []
    };
  }

  public setConfig(config: WthClimateCardConfig): void {
    if (!config || !Array.isArray(config.entities)) {
      throw new Error("wth-climate-card: 'entities' must be a list of climate entity configs.");
    }
    for (const e of config.entities) {
      if (!e.entity || !e.entity.startsWith("climate.")) {
        throw new Error(`wth-climate-card: '${e.entity}' is not a valid climate.* entity id.`);
      }
    }
    this._config = config;
    if (this._activeIndex >= config.entities.length) {
      this._activeIndex = 0;
    }
  }

  public getCardSize(): number {
    return 4;
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    // Applied directly on the host element (not via a :host CSS rule) so it
    // can be overridden per-config via the max_width option.
    if (this._config) {
      this.style.maxWidth = `${resolveMaxWidth(this._config)}px`;
    }
  }

  private get _lang(): string | undefined {
    return this.hass?.language;
  }

  private _selectRoom(index: number): void {
    this._activeIndex = index;
  }

  private _fireError(message: string): void {
    this._errorMessage = message;
    this.dispatchEvent(
      new CustomEvent("hass-notification", {
        detail: { message },
        bubbles: true,
        composed: true
      })
    );
    window.setTimeout(() => {
      this._errorMessage = undefined;
    }, 4000);
  }

  private async _step(entityConfig: WthClimateEntityConfig, direction: 1 | -1): Promise<void> {
    if (!this.hass) return;
    const stateObj = this.hass.states[entityConfig.entity];
    if (!stateObj || stateObj.state === "unavailable" || stateObj.state === "unknown") return;

    const attrs = stateObj.attributes;
    const step: number = typeof attrs.target_temp_step === "number" ? attrs.target_temp_step : 0.5;
    const min: number = typeof attrs.min_temp === "number" ? attrs.min_temp : 7;
    const max: number = typeof attrs.max_temp === "number" ? attrs.max_temp : 35;
    const current: number | undefined = attrs.temperature;

    if (typeof current !== "number") {
      this._fireError(localize(this._lang, "card.action_failed", { error: "no target temperature" }));
      return;
    }

    const raw = current + direction * step;
    const next = Math.min(max, Math.max(min, Math.round(raw * 100) / 100));
    if (next === current) return;

    try {
      await this.hass.callService("climate", "set_temperature", {
        entity_id: entityConfig.entity,
        temperature: next
      });
    } catch (err: any) {
      this._fireError(localize(this._lang, "card.action_failed", { error: err?.message ?? String(err) }));
    }
  }

  private _centerTap(entityConfig: WthClimateEntityConfig): void {
    if (!this.hass) return;
    const action = entityConfig.tap_action ?? DEFAULT_TAP_ACTION;
    if (!hasAction(action)) return;
    try {
      handleAction(
        this,
        this.hass,
        { entity: entityConfig.entity, tap_action: action } as any,
        "tap"
      );
    } catch (err: any) {
      this._fireError(localize(this._lang, "card.action_failed", { error: err?.message ?? String(err) }));
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const entities = this._config.entities ?? [];
    if (!entities.length) {
      return html`
        <ha-card>
          <div class="wth-empty">${localize(this._lang, "card.no_entities")}</div>
        </ha-card>
      `;
    }

    const activeIndex = Math.min(this._activeIndex, entities.length - 1);
    const active = entities[activeIndex];
    const stateObj = this.hass.states[active.entity];
    const unavailable = !stateObj || stateObj.state === "unavailable";

    const attrs = stateObj?.attributes ?? {};
    const step: number = typeof attrs.target_temp_step === "number" ? attrs.target_temp_step : 0.5;
    const target: number | undefined = attrs.temperature;
    const current: number | undefined = attrs.current_temperature;
    const humidity: number | undefined = attrs.current_humidity;
    const hvacAction: string | undefined = attrs.hvac_action;
    const flameOn = hvacAction === "heating";

    const topValues = resolveTopValues(active);
    const bottomValues = resolveBottomValues(active);
    const separator = resolveSeparator(active);
    const topText = fmtRow(topValues, stateObj, target, current, humidity, step, separator);
    const bottomText = fmtRow(bottomValues, stateObj, target, current, humidity, step, separator);

    const windowEntityIds = resolveWindowEntities(active);
    const windowOpen = windowEntityIds.some((id) => this.hass!.states[id]?.state === "on");
    const fontScale = resolveFontScale(this._config);

    return html`
      <ha-card>
        ${entities.length > 1 ? this._renderSelector(entities, activeIndex) : ""}
        <div class="wth-body">
          <div class="wth-graphic" style=${`--wth-font-scale: ${fontScale}`}>
            ${unavailable
              ? html`<div class="wth-unavailable">${localize(this._lang, "card.unavailable")}</div>`
              : html`
                  ${topText !== ""
                    ? html`<div class="wth-temp-target">${topText}</div>`
                    : ""}
                  ${bottomText !== ""
                    ? html`<div class="wth-temp-current">${bottomText}</div>`
                    : ""}
                  ${flameOn ? html`<ha-icon class="wth-flame" icon="mdi:fire"></ha-icon>` : ""}
                  ${windowOpen
                    ? html`<ha-icon class="wth-window" icon="mdi:window-open-variant"></ha-icon>`
                    : ""}
                  <button
                    class="wth-hotspot wth-center"
                    @click=${() => this._centerTap(active)}
                    aria-label="center button"
                  ></button>
                  <button
                    class="wth-hotspot wth-minus"
                    @click=${() => this._step(active, -1)}
                    aria-label="decrease temperature"
                  ></button>
                  <button
                    class="wth-hotspot wth-plus"
                    @click=${() => this._step(active, 1)}
                    aria-label="increase temperature"
                  ></button>
                `}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderSelector(entities: WthClimateEntityConfig[], activeIndex: number): TemplateResult {
    return html`
      <div class="wth-selector" role="tablist" aria-label=${localize(this._lang, "card.select_room")}>
        ${entities.map(
          (e, i) => html`
            <button
              class="wth-selector-chip ${i === activeIndex ? "active" : ""}"
              role="tab"
              aria-selected=${i === activeIndex}
              @click=${() => this._selectRoom(i)}
            >
              ${e.name || this.hass!.states[e.entity]?.attributes.friendly_name || e.entity}
            </button>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      /* Without a cap the card stretches to fill its whole dashboard grid
         column/section, leaving a large empty gap around the (centered)
         graphic instead of actually freeing up space next to the card. The
         actual value is set in updated() from the max_width config option
         (default 344px = .wth-graphic's 320px cap + ha-card's 12px padding
         on each side), since a static CSS rule can't be overridden per-config. */
    }
    ha-card {
      padding: 12px;
      overflow: hidden;
    }
    .wth-empty {
      padding: 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .wth-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .wth-selector-chip {
      border: none;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.85em;
      background: var(--secondary-background-color, #eee);
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .wth-selector-chip.active {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .wth-body {
      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: 10px;
    }
    .wth-graphic {
      position: relative;
      flex: 1 1 auto;
      aspect-ratio: 424 / 399;
      max-width: 320px;
      background-image: url(${unsafeCSS(WTH2_IMAGE)});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      /* The cqw units below need an explicit query container, otherwise they
         fall back to resolving against the viewport instead of this
         element's own (rendered) width - which made the text size depend on
         the browser window rather than the card's size in the dashboard. */
      container-type: inline-size;
    }
    .wth-unavailable {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      text-align: center;
      padding: 10%;
    }
    .wth-temp-target {
      position: absolute;
      top: 22%;
      left: 17%;
      transform: translateY(-50%);
      font-size: calc(clamp(1.4em, 7cqw, 2.4em) * var(--wth-font-scale, 1));
      font-weight: 600;
      color: #222;
      pointer-events: none;
    }
    .wth-temp-current {
      position: absolute;
      top: 38%;
      left: 17%;
      transform: translateY(-50%);
      font-size: calc(clamp(0.8em, 3.4cqw, 1.1em) * var(--wth-font-scale, 1));
      color: #555;
      pointer-events: none;
    }
    .wth-hotspot {
      position: absolute;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .wth-center {
      top: 56%;
      left: 50%;
      width: 16%;
      height: 16%;
      transform: translate(-50%, -50%);
      border-radius: 20%;
    }
    .wth-minus {
      top: 71%;
      left: 8.6%;
      width: 25.5%;
      height: 26%;
      border-radius: 50%;
    }
    .wth-plus {
      top: 71%;
      left: 66%;
      width: 25.5%;
      height: 26%;
      border-radius: 50%;
    }
    .wth-flame {
      position: absolute;
      top: 20%;
      left: 73%;
      transform: translate(-50%, -50%);
      --mdc-icon-size: calc(clamp(16px, 7cqw, 26px) * var(--wth-font-scale, 1));
      color: #000;
      pointer-events: none;
    }
    .wth-window {
      position: absolute;
      top: 38%;
      left: 73%;
      transform: translate(-50%, -50%);
      --mdc-icon-size: calc(clamp(16px, 7cqw, 26px) * var(--wth-font-scale, 1));
      color: #000;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "wth-climate-card": WthClimateCard;
  }
}
