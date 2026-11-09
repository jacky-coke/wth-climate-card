import { LitElement, html, css, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor, fireEvent } from "custom-card-helpers";
import {
  WthClimateCardConfig,
  WthClimateEntityConfig,
  WthClimateRowValue,
  ROW_VALUE_OPTIONS,
  resolveTopValues,
  resolveBottomValues
} from "./types";
import { localize } from "./localize";

@customElement("wth-climate-card-editor")
export class WthClimateCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: WthClimateCardConfig;

  public setConfig(config: WthClimateCardConfig): void {
    this._config = { ...config, entities: config.entities ?? [] };
  }

  private get _lang(): string | undefined {
    return this.hass?.language;
  }

  private _rowValueSelector(): {
    select: { multiple: true; mode: "dropdown"; options: { value: string; label: string }[] };
  } {
    return {
      select: {
        multiple: true,
        mode: "dropdown",
        options: ROW_VALUE_OPTIONS.map((option) => ({
          value: option,
          label: localize(this._lang, `editor.row_value.${option}`)
        }))
      }
    };
  }

  private _emitConfig(entities: WthClimateEntityConfig[]): void {
    if (!this._config) return;
    this._config = { ...this._config, entities };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _updateEntity(index: number, patch: Partial<WthClimateEntityConfig>): void {
    if (!this._config) return;
    const entities = [...this._config.entities];
    entities[index] = { ...entities[index], ...patch };
    this._emitConfig(entities);
  }

  private _addEntity(): void {
    if (!this._config) return;
    this._emitConfig([...this._config.entities, { entity: "" } as WthClimateEntityConfig]);
  }

  private _removeEntity(index: number): void {
    if (!this._config) return;
    const entities = [...this._config.entities];
    entities.splice(index, 1);
    this._emitConfig(entities);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="wth-editor">
        <h3>${localize(this._lang, "editor.entities_heading")}</h3>
        ${this._config.entities.length === 0
          ? html`<p class="hint">${localize(this._lang, "editor.no_entities")}</p>`
          : this._config.entities.map((entity, index) => this._renderEntityRow(entity, index))}
        <mwc-button outlined @click=${this._addEntity}>
          ${localize(this._lang, "editor.add_entity")}
        </mwc-button>
      </div>
    `;
  }

  private _renderEntityRow(entity: WthClimateEntityConfig, index: number): TemplateResult {
    return html`
      <div class="wth-entity-row">
        <ha-entity-picker
          .hass=${this.hass}
          .value=${entity.entity}
          .label=${localize(this._lang, "editor.entity")}
          .includeDomains=${["climate"]}
          @value-changed=${(ev: CustomEvent) =>
            this._updateEntity(index, { entity: ev.detail.value })}
        ></ha-entity-picker>

        <ha-selector
          .hass=${this.hass}
          .label=${localize(this._lang, "editor.name")}
          .selector=${{ text: {} }}
          .value=${entity.name ?? ""}
          @value-changed=${(ev: CustomEvent) =>
            this._updateEntity(index, { name: (ev.detail.value as string) || undefined })}
        ></ha-selector>

        <ha-entity-picker
          .hass=${this.hass}
          .value=${entity.window_entity ?? ""}
          .label=${localize(this._lang, "editor.window_entity")}
          .includeDomains=${["binary_sensor"]}
          @value-changed=${(ev: CustomEvent) =>
            this._updateEntity(index, { window_entity: ev.detail.value || undefined })}
        ></ha-entity-picker>

        <hui-action-editor
          .hass=${this.hass}
          .label=${localize(this._lang, "editor.tap_action")}
          .config=${entity.tap_action}
          .actions=${["default", "navigate", "url", "perform-action", "more-info", "none"]}
          @value-changed=${(ev: CustomEvent) =>
            this._updateEntity(index, { tap_action: ev.detail.value })}
        ></hui-action-editor>

        <div class="wth-row-select">
          <ha-selector
            .hass=${this.hass}
            .label=${localize(this._lang, "editor.top_value")}
            .selector=${this._rowValueSelector()}
            .value=${resolveTopValues(entity)}
            @value-changed=${(ev: CustomEvent) =>
              this._updateEntity(index, {
                top_values: ev.detail.value as WthClimateRowValue[],
                top_value: undefined
              })}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .label=${localize(this._lang, "editor.bottom_value")}
            .selector=${this._rowValueSelector()}
            .value=${resolveBottomValues(entity)}
            @value-changed=${(ev: CustomEvent) =>
              this._updateEntity(index, {
                bottom_values: ev.detail.value as WthClimateRowValue[],
                bottom_value: undefined
              })}
          ></ha-selector>
        </div>

        <mwc-button class="remove" @click=${() => this._removeEntity(index)}>
          ${localize(this._lang, "editor.remove_entity")}
        </mwc-button>
      </div>
    `;
  }

  static styles = css`
    .wth-editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .wth-entity-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      margin-bottom: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .remove {
      align-self: flex-end;
      --mdc-theme-primary: var(--error-color);
    }
    .wth-row-select {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .wth-row-select ha-selector {
      flex: 1 1 200px;
    }
    .wth-entity-row > ha-selector {
      width: 100%;
    }
  `;
}
