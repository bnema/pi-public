# Creative Charm TUI component recipes

Use this when agents are making boring TUI screens or need ideas for original Go terminal interfaces with Bubble Tea v2, Bubbles v2, and Lip Gloss v2.

## Design process

1. Pick a metaphor: palette, inbox, cockpit, map, notebook, wizard, board, timeline, canvas, command center.
2. Pick one primary interaction: filter, browse, edit, inspect, drag/click, approve, monitor, compare.
3. Pick a layout: single pane, sidebar+detail, split editor, cards grid, overlay dialog, bottom command bar.
4. Pick components: one primary Bubble, one secondary Bubble, optional Lip Gloss layer overlay.
5. Define messages before code: `loadedMsg`, `selectedMsg`, `submittedMsg`, `clickedMsg`, `tickMsg`, `errorMsg`.

## Component recipes

| Idea | Components | Notes |
|---|---|---|
| Command palette | `textinput` + `list` + overlay `Layer` | filter commands; enter dispatches command; escape closes |
| Split inspector | `list` + `viewport` | left items, right rich details; resize both on `WindowSizeMsg` |
| Log explorer | `viewport` + search `textinput` | line gutter, highlights, follow-tail toggle |
| Setup wizard | `huh.Form` + `spinner` | groups as steps; validate; run async command after submit |
| Kanban board | custom columns + `list` per column | focus column; move cards with keys; use badges |
| Chat console | `viewport` transcript + `textarea` composer + spinner | async send command; streaming response messages |
| File workbench | `filepicker` + `viewport` preview + `table` metadata | select path, preview content, confirm action |
| Metrics dashboard | cards with `progress`, `sparkline`-like custom rows | tick loop; native `tea.View.ProgressBar` for long task |
| Clickable dialog | Lip Gloss `Layer` + `View.OnMouse` | hit-test buttons; z-index overlays |
| Diff/review TUI | `viewport` + `list` comments + table summary | per-line `StyleLineFunc`; jump between highlights |
| Tiny game/canvas | Lip Gloss `Canvas`/layers + `tea.Tick` | 30/60 FPS with `Tick`; keep state small |
| Package installer | `list` + `spinner` + `progress` + `Sequence` | copy `bubbletea/examples/package-manager` pattern |

## Make it feel polished

- Header: current mode/title, status badge, dimensions/debug only behind flag.
- Body: one obvious focused element. Use focus ring/border, not many colors.
- Footer: short help from `help.Model`; hide advanced keys until `?`.
- Empty states: render useful next action, not blank panes.
- Loading: spinner plus exact operation text; stop spinner when loaded.
- Errors: keep error in model; render retry key; never panic for network/files.
- Resize: recompute widths/heights every `WindowSizeMsg`.
- Light/dark: build styles after `tea.BackgroundColorMsg`.

## Animation patterns

- One-shot delayed effect: `tea.Tick` and return another `tea.Tick` only while active.
- Clock-aligned time: `tea.Every` and re-return in tick handler.
- Spinner: `m.spinner.Tick` in `Init`, and again on `spinner.TickMsg`.
- Progress: model holds percent; async commands emit updates; view renders `progress.ViewAs(percent)`.
- Debounce: store input revision; tick returns revision; ignore stale revision.

## Interaction patterns

- Focus ring: parent model has `focus enum`; only focused component updates on keys.
- Global keys first: `q`, `ctrl+c`, `?`, `esc`; then delegate to components.
- Modal overlay: if modal open, update modal only; background still renders muted.
- Click targets: assign Lip Gloss layer IDs; `OnMouse` emits domain message, not direct mutation.
- Async safety: include request IDs in messages; ignore stale completions.

## Avoid boring TUIs

- Don't render a static menu if a command palette/filter would work.
- Don't use a table for everything; pair a compact list with a rich detail pane.
- Don't over-border; whitespace and alignment are more elegant.
- Don't expose all keybinds at once; progressive help is cleaner.
- Don't block in `Update`; create a `tea.Cmd`.
