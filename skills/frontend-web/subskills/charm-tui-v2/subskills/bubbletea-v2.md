# Bubble Tea v2 sub-skill

Use this for `tea.Model`, `tea.Cmd`, async work, messages, `tea.View`, keyboard/mouse, layers, testing, and v1→v2 migration.

## Imports and shape

```go
import tea "charm.land/bubbletea/v2"

type Model interface {
    Init() tea.Cmd
    Update(tea.Msg) (tea.Model, tea.Cmd)
    View() tea.View
}
```

`tea.Msg` is any event. `tea.Cmd` is `func() tea.Msg`. `Update` is pure-ish state transition plus optional command. Commands run async; their returned message re-enters `Update`.

## v2 declarative view fields

`View()` returns `tea.View`, not string. Build content with `tea.NewView(s)` or `var v tea.View; v.SetContent(s)`.

Set terminal features on the returned view:

| Field | Use |
|---|---|
| `AltScreen` | full-screen TUI |
| `MouseMode` | `tea.MouseModeNone`, `CellMotion`, `AllMotion` |
| `ReportFocus` | receive `FocusMsg`/`BlurMsg` |
| `DisableBracketedPasteMode` | opt out of bracketed paste |
| `WindowTitle` | terminal title |
| `Cursor` | real cursor position/style |
| `ForegroundColor`, `BackgroundColor` | terminal colors |
| `ProgressBar` | native terminal progress bar |
| `KeyboardEnhancements` | key release/repeat/alternate key requests |
| `OnMouse` | map mouse coords to rendered content/layers |

Never use v1 options/commands like `WithAltScreen`, `EnterAltScreen`, `EnableMouseCellMotion`; v2 wants view fields.

## Message handling quick ref

```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    var cmds []tea.Cmd
    switch msg := msg.(type) {
    case tea.WindowSizeMsg:
        m.w, m.h = msg.Width, msg.Height
    case tea.BackgroundColorMsg:
        m.isDark = msg.IsDark()
    case tea.KeyPressMsg:
        switch msg.String() {
        case "q", "ctrl+c": return m, tea.Quit
        case "space": m.toggled = !m.toggled
        }
    case tea.KeyReleaseMsg:
        // only if KeyboardEnhancements.ReportEventTypes requested and supported
    case tea.PasteMsg:
        m.buffer += msg.Content
    case tea.MouseClickMsg:
        if msg.Button == tea.MouseLeft { m.clicked = msg.Mouse() }
    case tea.MouseWheelMsg:
        // wheel up/down/left/right
    }
    return m, tea.Batch(cmds...)
}
```

v2 key changes: `tea.KeyPressMsg`; `msg.Code`, `msg.Text`, `msg.Mod`; `msg.Mod.Contains(tea.ModAlt)`; `"space"` not `" "`; use `msg.Keystroke()` when modifiers matter.

v2 mouse changes: `tea.MouseMsg` is an interface; get data with `msg.Mouse()`. Prefer specific `tea.MouseClickMsg`, `MouseReleaseMsg`, `MouseWheelMsg`, `MouseMotionMsg`. Buttons are `tea.MouseLeft`, `tea.MouseRight`, `tea.MouseWheelUp`, etc.

## Commands

| Command | Pattern |
|---|---|
| `tea.Batch(a,b)` | concurrent; no ordering guarantee |
| `tea.Sequence(a,b)` | ordered execution |
| `tea.Tick(d, fn)` | one delayed message |
| `tea.Every(d, fn)` | clock-aligned one-shot; re-return to loop |
| `tea.RequestWindowSize` | asks terminal for size |
| `tea.RequestBackgroundColor` | needed for light/dark styles, SSH/Wish-safe |

Command factory pattern:

```go
type loadedMsg struct{ rows []row; err error }
func loadRows(id string) tea.Cmd {
    return func() tea.Msg { rows, err := fetchRows(id); return loadedMsg{rows, err} }
}
```

## Composition pattern with Bubbles

```go
var cmd tea.Cmd
m.input, cmd = m.input.Update(msg); cmds = append(cmds, cmd)
m.list, cmd = m.list.Update(msg); cmds = append(cmds, cmd)
// then handle parent-level keys/messages
return m, tea.Batch(cmds...)
```

Only update focused/visible components unless multiple components truly need the same message.

## Clickable layers pattern

Use Lip Gloss layers plus `View.OnMouse`:

```go
root := lipgloss.NewLayer(bg).ID("root").AddLayers(buttonLayer.ID("save").X(4).Y(8).Z(2))
comp := lipgloss.NewCompositor(root)
v := tea.NewView(comp.Render())
v.MouseMode = tea.MouseModeCellMotion
v.OnMouse = func(msg tea.MouseMsg) tea.Cmd {
    return func() tea.Msg {
        mouse := msg.Mouse()
        hit := comp.Hit(mouse.X, mouse.Y)
        if hit.Empty() { return nil }
        return clickedMsg{id: hit.ID(), mouse: mouse}
    }
}
```

## Local examples to inspect

- Basics: `bubbletea/examples/simple`, `views`, `window-size`
- Async: `http`, `realtime`, `send-msg`, `tui-daemon-combo`
- Commands: `sequence`, `debounce`, `timer`, `stopwatch`
- Components: `textinput`, `textarea`, `list-*`, `table`, `viewport/pager`, `spinner`, `progress-*`
- v2 view features: `clickable`, `canvas`, `keyboard-enhancements`, `cursor-style`, `progress-bar`, `set-window-title`, `mouse`

Official source docs: `bubbletea/UPGRADE_GUIDE_V2.md`, `bubbletea/tea.go`, `bubbletea/commands.go`, docs index `https://mintlify.wiki/charmbracelet/bubbletea/llms.txt`.
