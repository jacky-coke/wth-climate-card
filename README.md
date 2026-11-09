# WTH Climate Card

A Home Assistant Lovelace card for people who are sick of a dozen identical
thermostat widgets stacked on top of each other.

Instead of one card per room, WTH Climate Card gives you **one card for your
whole house**: a wall-thermostat-styled display you flip through room by room
with a tab bar, modeled after the look of a real **Homematic IP WTH2**
wall thermostat — which is exactly what's mounted on the walls here.

![WTH Climate Card screenshot](docs/screenshot.png)

## Why

Most dashboards end up with a thermostat card per room, all identical, all
taking up space, none of them telling you anything at a glance. This card
was built to replace that wall of duplicate widgets with a single, clean
display that looks (and behaves) like an actual thermostat on the wall.

## Features

- **One card, every room.** Add as many rooms as you like; switch between
  them with the chip selector at the top.
- **Works with any `climate.*` entity**, not just Homematic IP devices — the
  WTH2 look is just the default skin, the card itself is generic.
- **Configurable display rows.** Pick what the large (top) and small
  (bottom) row show using Home Assistant's native "state content" picker —
  search and add target temperature, current temperature, humidity, state,
  or any other attribute the entity exposes, reorder them by dragging, or
  type your own free-text value (e.g. a literal `-`). Combine as many as you
  like, joined together (e.g. `18.0° · 47%`).
- **Configurable separator.** Choose how combined values are joined — middle
  dot, dash, space, asterisk, slash, or type your own.
- **Smart icons.** The flame and window icons only show up when they're
  actually relevant: the flame appears only while the thermostat reports
  active heating, and the window icon only appears when at least one window
  sensor (or helper) is configured *and* reports `on` — you can assign more
  than one window/door sensor per room, OR-combined, and no icon clutter for
  rooms that don't have any.
- **Freely assignable center button.** Wire it up to anything Home
  Assistant's action editor supports: more-info, navigate, a script, a
  scene, whatever fits.
- **+ / − buttons** step the target temperature using the entity's own
  step size and min/max limits.
- **Configurable sizing.** Scale the display's text/icons (`font_scale`) and
  cap the card's own width (`max_width`) via YAML — handy if the default
  text size doesn't fit your screen, or if the card is stretching to fill a
  wide dashboard section and you want real space next to it for other
  cards or icons.

## Installation

### HACS (recommended)

1. In Home Assistant, go to **HACS → ⋮ → Custom repositories**.
2. Add `https://github.com/jacky-coke/wth-climate-card` as the repository
   URL and pick **Dashboard** as the category.
3. Install "WTH Climate Card" and reload your browser.

### Manual

1. Copy `dist/wth-climate-card.js` from this repo into
   `<config>/www/wth-climate-card/wth-climate-card.js`.
2. Add it as a Lovelace resource (**Settings → Dashboards → ⋮ → Resources**):
   - URL: `/local/wth-climate-card/wth-climate-card.js`
   - Resource type: JavaScript Module

## Usage

Add the card through the dashboard UI (search for "WTH Climate Card" when
adding a card) or via YAML:

```yaml
type: custom:wth-climate-card
entities:
  - entity: climate.living_room
    name: Living Room
    window_entities:
      - binary_sensor.living_room_window
      - binary_sensor.living_room_balcony_door
    top_values:
      - current_temperature
    bottom_values:
      - temperature
      - current_humidity
    separator: " - "
    tap_action:
      action: more-info
  - entity: climate.bedroom
    name: Bedroom
font_scale: 0.85
max_width: 300
```

All of the per-room options below are also configurable through the visual
card editor — no YAML required. The row-value pickers reuse Home Assistant's
native "state content" field: click **+ Add** to search and pick a value,
drag chips to reorder them, or type your own free-text value.

<img src="docs/editor-picker.png" width="420" alt="Adding a row value through the native state-content picker"> <img src="docs/editor-config.png" width="420" alt="Card editor showing row-value chips and the separator option">

### Per-room options (inside `entities`)

| Option             | Required | Description                                                                 |
| ------------------ | -------- | ----------------------------------------------------------------------------|
| `entity`           | yes      | A `climate.*` entity.                                                       |
| `name`             | no       | Display name for the room tab. Defaults to the entity's friendly name.      |
| `window_entities`  | no       | List of `binary_sensor` entities (or helpers). The window icon shows up when **any** of them is `on`. |
| `tap_action`       | no       | Action for the center button. Defaults to no action.                       |
| `top_values`       | no       | List of entity attributes (e.g. `temperature`, `current_temperature`, `current_humidity`, `state`) or free text, shown in the large row. Default: `temperature`. |
| `bottom_values`    | no       | Same as above, for the small row. Default: `current_temperature`.          |
| `separator`        | no       | String joining multiple values within a row. Default: `" · "`.             |

### Card-wide options (top-level, next to `entities`)

These two aren't exposed in the visual editor — set them via YAML or the
card's "Show code editor" view.

| Option       | Required | Description                                                                          |
| ------------ | -------- | --------------------------------------------------------------------------------------|
| `font_scale` | no       | Multiplies the display's text/icon size. Default: `1`. Must be > 0 — try `0.7`–`0.9` for smaller text. |
| `max_width`  | no       | Caps the card's own width in pixels, so it doesn't stretch to fill a wide dashboard grid column/section. Default: `344` (the thermostat graphic's own 320px cap plus the card's padding). Must be > 0 — lower it if you want to place other cards/icons next to it. |

## License

MIT, see [LICENSE](LICENSE).
