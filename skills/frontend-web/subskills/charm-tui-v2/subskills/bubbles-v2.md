# Bubbles v2 sub-skill

Use this for reusable Bubble Tea components: text inputs, textareas, lists, tables, viewport/pager, spinners, progress bars, help, key maps, timers.

## Imports

```go
import (
    "charm.land/bubbles/v2/key"
    "charm.land/bubbles/v2/list"
    "charm.land/bubbles/v2/textarea"
    "charm.land/bubbles/v2/textinput"
    "charm.land/bubbles/v2/viewport"
)
```

Bubbles v2 requires Bubble Tea v2 and Lip Gloss v2. Never mix `github.com/charmbracelet/...` with `charm.land/.../v2`.

## Global v2 rules

| v1 habit | v2 rule |
|---|---|
| `tea.KeyMsg` | `tea.KeyPressMsg` |
| exported `Width`/`Height` fields | `SetWidth`, `SetHeight`, `Width()`, `Height()` |
| `DefaultKeyMap` var | `DefaultKeyMap()` func for paginator/textarea/textinput |
| `NewModel` | `New` |
| automatic adaptive styles | pass `isDark bool` to `DefaultStyles` where required |
| string colors | use `lipgloss.Color(...)` (`image/color.Color`) |

## Component selection

| Component | Use for | Key v2 notes |
|---|---|---|
| `textinput` | one-line input, command palette, search, autocomplete | `SetWidth`, `DefaultStyles(isDark)`, `SetVirtualCursor(false)` for real cursor |
| `textarea` | multiline editor/chat composer/log note | nested `Styles`, `DefaultKeyMap()`, `SetCursorColumn`, page up/down |
| `list` | fuzzy list, picker, inbox, palette | custom `ItemDelegate`; `DefaultStyles(isDark)`; filter styles are `textinput.Styles` |
| `viewport` | scrollable docs/logs/detail pane | `viewport.New(WithWidth, WithHeight)`, soft wrap, gutter, highlights, per-line style |
| `table` | structured rows | configure columns/rows; set dimensions via setters |
| `spinner` | loading | `spinner.New`; schedule `m.spinner.Tick` |
| `progress` | progress meters | `WithColors(lipgloss.Color(...))`, `WithDefaultBlend`, `WithScaled(true)` |
| `help` + `key` | discoverable bindings | implement `ShortHelp() []key.Binding`, `FullHelp() [][]key.Binding` |
| `timer` / `stopwatch` | countdowns/elapsed time | option constructors: `timer.New(d, timer.WithInterval(...))` |
| `filepicker` | file choose flows | `SetHeight`; returns selected path |
| `paginator` | pages/carousels | customize `KeyMap`; `DefaultKeyMap()` |

## Parent model pattern

```go
type model struct {
    isDark bool
    input textinput.Model
    list  list.Model
    vp    viewport.Model
    help  help.Model
    focus int
}

func newModel() model {
    ti := textinput.New(); ti.Placeholder = "Search"; ti.Focus(); ti.SetWidth(30)
    vp := viewport.New(viewport.WithWidth(80), viewport.WithHeight(20)); vp.SoftWrap = true
    return model{input: ti, vp: vp, help: help.New()}
}

func (m model) Init() tea.Cmd { return tea.Batch(textinput.Blink, tea.RequestBackgroundColor) }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    var cmds []tea.Cmd; var cmd tea.Cmd
    switch msg := msg.(type) {
    case tea.BackgroundColorMsg:
        m.isDark = msg.IsDark()
        m.input.SetStyles(textinput.DefaultStyles(m.isDark))
        m.list.Styles = list.DefaultStyles(m.isDark)
    case tea.WindowSizeMsg:
        m.vp.SetWidth(msg.Width-4); m.vp.SetHeight(msg.Height-6)
    case tea.KeyPressMsg:
        if msg.String() == "tab" { m.focus = (m.focus+1)%2 }
    }
    if m.focus == 0 { m.input, cmd = m.input.Update(msg); cmds = append(cmds, cmd) }
    if m.focus == 1 { m.vp, cmd = m.vp.Update(msg); cmds = append(cmds, cmd) }
    return m, tea.Batch(cmds...)
}
```

## Textinput ideas

- command palette: filter list by `input.Value()`
- fuzzy search header over viewport/list
- autocomplete using `SetSuggestions(...)`
- inline rename/edit cell in table
- real terminal cursor: `ti.SetVirtualCursor(false)` then set `v.Cursor = ti.Cursor()` in parent `View()` when focused

## Viewport ideas

- code/log viewer with `LeftGutterFunc` line numbers
- search hits with `SetHighlights`, `HighlightNext`, `HighlightPrevious`
- markdown preview with `SoftWrap = true`
- diff viewer with `StyleLineFunc` per-line coloring
- tailing logs: set content, then `GotoBottom()` after new lines

## List ideas

- custom delegate with status badges, selected preview, inline help
- command palette with hidden title/status/pagination for compactness
- inbox triage: list left, viewport detail right
- background loading: show spinner/status message while items stream in

## Progress/spinner ideas

- use Bubble Tea native `tea.View.ProgressBar` for terminal-integrated progress; use Bubbles `progress` when you need in-content themed bars.
- when animating progress, return `tea.Tick` loop until complete; when spinner, return `m.spinner.Tick` on each `spinner.TickMsg`.

## Local source anchors

- Upgrade guide: `bubbles/UPGRADE_GUIDE_V2.md`
- Component source dirs: `bubbles/{textinput,textarea,list,viewport,table,spinner,progress,help,key,filepicker}`
- Bubble Tea examples using Bubbles: `bubbletea/examples/{textinput,textinputs,textarea,dynamic-textarea,list-default,list-fancy,list-simple,table,table-resize,pager,spinner,spinners,progress-*}`
