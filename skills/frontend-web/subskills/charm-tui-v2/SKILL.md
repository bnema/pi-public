---
name: charm-tui-v2
description: Use when building, debugging, migrating, or creatively designing Go terminal UIs with Charm Bubble Tea v2, Bubbles v2, Lip Gloss v2, Huh v2, tea.View, layers, mouse, forms, tables, lists, text input, viewport, spinners, progress, or charm.land imports.
---

# Charm TUI v2

## Core principle

For Charm v2, design the UI as **state + messages + declarative view capabilities**. Do not cargo-cult v1 snippets: imports are `charm.land/.../v2`, `View()` returns `tea.View`, keys/mouse are new message types, and terminal features belong on `tea.View` fields.

## Required sub-skills

Load only what the task needs:

| Need | Read |
|---|---|
| App architecture, commands, messages, testing, v2 migration | `subskills/bubbletea-v2.md` |
| Lists, textinput, textarea, viewport, table, spinner, progress, help, key bindings | `subskills/bubbles-v2.md` |
| Styling, layout, layers/canvas, tables/trees, color v2 | `subskills/lipgloss-v2.md` |
| Forms/wizards/prompts and Bubble Tea embedding | `subskills/huh-v2.md` |
| Creative TUI component ideas and composition recipes | `subskills/creative-components.md` |
| Local official examples worth copying from | `subskills/examples-index.md` |

## First move on any Charm task

1. Check current code imports. If it uses `github.com/charmbracelet/...`, treat examples/API as v1 unless proven otherwise.
2. Prefer local source/examples in `$HOME/dev/clone/charmbracelet/{bubbletea,bubbles,lipgloss,huh}` before memory.
3. For a new UI, sketch: screens, model fields, message types, components, layout zones, and view capabilities (`AltScreen`, mouse, cursor, title, keyboard enhancements).
4. Write a tiny compiling skeleton first, then add components one by one.

## v2 minimum skeleton

```go
package main

import (
    "fmt"
    "os"

    tea "charm.land/bubbletea/v2"
)

type model struct{ ready bool; w, h int }

func (m model) Init() tea.Cmd { return tea.RequestBackgroundColor }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.WindowSizeMsg:
        m.ready, m.w, m.h = true, msg.Width, msg.Height
    case tea.KeyPressMsg:
        switch msg.String() {
        case "q", "ctrl+c": return m, tea.Quit
        }
    }
    return m, nil
}

func (m model) View() tea.View {
    v := tea.NewView("loading...")
    v.AltScreen = true
    if m.ready { v.SetContent(fmt.Sprintf("%dx%d — q to quit", m.w, m.h)) }
    return v
}

func main() {
    if _, err := tea.NewProgram(model{}).Run(); err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
}
```

## Creativity checklist

- Choose an interaction metaphor: command palette, dashboard, kanban board, timeline, split editor, chat, wizard, inspector, file explorer, game-like canvas.
- Combine 2-4 Bubbles, not 12. Make one component primary and the rest contextual.
- Use Lip Gloss for hierarchy: spacing, borders, muted metadata, badges, adaptive light/dark palette.
- Use `tea.View` fields for terminal affordances: alt screen, mouse mode, cursor, progress bar, title.
- If the UI needs click targets or overlays, use Lip Gloss `Layer`/`Compositor` and Bubble Tea `View.OnMouse`.
- Always handle resize and constrain component width/height via setter methods in v2.

## Common failures to prevent

| Symptom | Likely fix |
|---|---|
| `View() string` compile errors | Return `tea.View`; wrap content with `tea.NewView(s)` |
| `tea.KeyMsg` examples don't match | Use `tea.KeyPressMsg`; space is `"space"` |
| `WithAltScreen`, mouse commands missing | Set `v.AltScreen`, `v.MouseMode` in `View()` |
| Bubbles width fields missing | Use `SetWidth/SetHeight` and `Width()/Height()` |
| colors/types fail | Lip Gloss v2 colors are `color.Color`; use `lipgloss.Color(...)` |
| styles look wrong in light terminals | request `tea.RequestBackgroundColor` and build styles with `isDark` |
| stale examples | copy from local v2 clones, not random v1 blog posts |

## Local evidence anchors

- Bubble Tea clone: `$HOME/dev/clone/charmbracelet/bubbletea` currently `v2.0.7`.
- Bubbles clone: `$HOME/dev/clone/charmbracelet/bubbles` currently post `v2.0.0-rc.1`.
- Lip Gloss clone: `$HOME/dev/clone/charmbracelet/lipgloss` currently post `v2.0.0-beta.3`.
- Huh clone: `$HOME/dev/clone/charmbracelet/huh` currently post `v2.0.3`.
- Official docs index: `https://mintlify.wiki/charmbracelet/bubbletea/llms.txt`.
