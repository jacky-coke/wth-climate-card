import { LitElement, html, css, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor, fireEvent } from "custom-card-helpers";
import {
  WthClimateCardConfig,
  WthClimateEntityConfig,
  WthClimateRowValue,
  SEPARATOR_OPTIONS,
  resolveTopValues,
  resolveBottomValues,
  resolveSeparator,
  resolveWindowEntities
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

  // Reuses HA's own "state content" picker (the same field behind the Tile card's
  // "Zustandsinhalt" option): add-one-at-a-time via search, removable + reorderable
  // chips, options sourced live from the room's own climate entity's attributes.
  private _rowValueSelector(entityId: string): { ui_state_content: { entity_id: string } } {
    return { ui_state_content: { entity_id: entityId } };
  }

  private static readonly SEPARATOR_LABEL_KEYS: Record<string, string> = {
    " · ": "middle_dot",
    " - ": "dash",
    " ": "space",
    " * ": "asterisk",
    " / ": "slash"
  };

  private _separatorSelector(): {
    select: { custom_value: true; options: { value: string; label: string }[] };
  } {
    return {
      select: {
        custom_value: true,
        options: SEPARATOR_OPTIONS.map((value) => {
          const key = WthClimateCardEditor.SEPARATOR_LABEL_KEYS[value];
          const symbol = value === " " ? "␣" : value.trim();
          return {
            value,
            label: key
              ? `${localize(this._lang, `editor.separator_options.${key}`)} (${symbol})`
              : value
          };
        })
      }
    };
  }

  // ui_state_content's value-changed fires undefined (0 items), a bare string (1
  // item) or a string[] (2+ items) — normalize to the array shape we store.
  private _asArray(value: string | string[] | undefined): WthClimateRowValue[] {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
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

  private _updateWindowEntity(index: number, winIndex: number, value: string): void {
    if (!this._config) return;
    const list = resolveWindowEntities(this._config.entities[index]);
    list[winIndex] = value;
    this._updateEntity(index, { window_entities: list, window_entity: undefined });
  }

  private _addWindowEntity(index: number): void {
    if (!this._config) return;
    const list = resolveWindowEntities(this._config.entities[index]);
    this._updateEntity(index, { window_entities: [...list, ""], window_entity: undefined });
  }

  private _removeWindowEntity(index: number, winIndex: number): void {
    if (!this._config) return;
    const list = resolveWindowEntities(this._config.entities[index]);
    list.splice(winIndex, 1);
    this._updateEntity(index, { window_entities: list, window_entity: undefined });
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

        <div class="wth-window-entities">
          <label class="wth-label">${localize(this._lang, "editor.window_entities")}</label>
          ${resolveWindowEntities(entity).map(
            (id, winIndex) => html`
              <div class="wth-window-entity-row">
                <ha-entity-picker
                  .hass=${this.hass}
                  .value=${id}
                  .includeDomains=${["binary_sensor"]}
                  @value-changed=${(ev: CustomEvent) =>
                    this._updateWindowEntity(index, winIndex, ev.detail.value)}
                ></ha-entity-picker>
                <button
                  class="wth-icon-remove"
                  @click=${() => this._removeWindowEntity(index, winIndex)}
                  aria-label=${localize(this._lang, "editor.remove_window_entity")}
                >
                  ✕
                </button>
              </div>
            `
          )}
          <mwc-button outlined @click=${() => this._addWindowEntity(index)}>
            ${localize(this._lang, "editor.add_window_entity")}
          </mwc-button>
        </div>

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
            .selector=${this._rowValueSelector(entity.entity)}
            .value=${resolveTopValues(entity)}
            @value-changed=${(ev: CustomEvent) =>
              this._updateEntity(index, {
                top_values: this._asArray(ev.detail.value),
                top_value: undefined
              })}
          ></ha-selector>

          <ha-selector
            .hass=${this.hass}
            .label=${localize(this._lang, "editor.bottom_value")}
            .selector=${this._rowValueSelector(entity.entity)}
            .value=${resolveBottomValues(entity)}
            @value-changed=${(ev: CustomEvent) =>
              this._updateEntity(index, {
                bottom_values: this._asArray(ev.detail.value),
                bottom_value: undefined
              })}
          ></ha-selector>
        </div>

        <ha-selector
          .hass=${this.hass}
          .label=${localize(this._lang, "editor.separator")}
          .selector=${this._separatorSelector()}
          .value=${resolveSeparator(entity)}
          @value-changed=${(ev: CustomEvent) =>
            this._updateEntity(index, { separator: (ev.detail.value as string) || undefined })}
        ></ha-selector>

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
    .wth-window-entities {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .wth-label {
      font-size: 0.75em;
      color: var(--secondary-text-color);
    }
    .wth-window-entity-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .wth-window-entity-row ha-entity-picker {
      flex: 1 1 auto;
    }
    .wth-icon-remove {
      border: none;
      background: transparent;
      color: var(--secondary-text-color);
      cursor: pointer;
      font-size: 1em;
      line-height: 1;
      padding: 8px;
    }
  `;
}
