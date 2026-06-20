# Lip Gloss v2 sub-skill

Use this for terminal styling, layout, tables, trees, lists, layers/canvas, colors, and v1→v2 Lip Gloss migration.

## Imports and color v2

```go
import "charm.land/lipgloss/v2"
import "charm.land/lipgloss/v2/table"
import "charm.land/lipgloss/v2/tree"
```

Important v2 changes:

| v1 | v2 |
|---|---|
| `github.com/charmbracelet/lipgloss` | `charm.land/lipgloss/v2` |
| `type Color string` | `func Color(string) color.Color` |
| `TerminalColor` | `image/color.Color` |
| `AdaptiveColor` | `compat.AdaptiveColor` or recommended `lipgloss.LightDark(isDark)` |
| `Renderer` / `NewRenderer` | removed; use plain `lipgloss.NewStyle()` |
| `fmt.Println(style.Render(...))` standalone | `lipgloss.Println(...)` for downsampling |
| `HasDarkBackground()` | `HasDarkBackground(in, out)` standalone; in Bubble Tea request background color |

Bubble Tea v2 handles output/downsampling, so inside Bubble Tea just render strings with Lip Gloss and return `tea.NewView(s)`.

## Style system pattern

```go
type styles struct { title, box, muted, accent lipgloss.Style }

func newStyles(isDark bool) styles {
    ld := lipgloss.LightDark(isDark)
    fg := ld(lipgloss.Color("#202124"), lipgloss.Color("#ECEFF4"))
    accent := ld(lipgloss.Color("#005CC5"), lipgloss.Color("#88C0D0"))
    return styles{
        title: lipgloss.NewStyle().Bold(true).Foreground(accent),
        box: lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).Padding(1, 2).BorderForeground(accent),
        muted: lipgloss.NewStyle().Foreground(ld(lipgloss.Color("#6A737D"), lipgloss.Color("#6B7280"))),
        accent: lipgloss.NewStyle().Foreground(fg).Background(accent).Padding(0, 1),
    }
}
```

## Layout quick ref

| Need | API |
|---|---|
| horizontal panes | `lipgloss.JoinHorizontal(lipgloss.Top, left, right)` |
| vertical stack | `lipgloss.JoinVertical(lipgloss.Left, top, bottom)` |
| center/place | `lipgloss.Place(w,h,lipgloss.Center,lipgloss.Center,s)` |
| fit width | style `.Width(n)`, `.MaxWidth(n)`, `.Inline(false)` |
| boxes | `.Border(...)`, `.Padding(...)`, `.Margin(...)` |
| responsive | recompute styles/content using `tea.WindowSizeMsg` |

Keep layout functions pure: `renderHeader(m)`, `renderSidebar(m)`, `renderMain(m)`, `renderFooter(m)`.

## Layers and clickable UI

Lip Gloss v2 has `Layer` and `Compositor` for overlays, z-index, and hit testing.

```go
card := lipgloss.NewLayer(cardStyle.Render("Details")).ID("card").X(4).Y(2).Z(1)
button := lipgloss.NewLayer(buttonStyle.Render(" Save ")).ID("save").X(8).Y(8).Z(2)
comp := lipgloss.NewCompositor(card, button)
content := comp.Render()
hit := comp.Hit(x, y) // topmost ID at coords
```

Use for dialogs, draggable panels, contextual popovers, clickable buttons, floating command palettes, game sprites, or annotations over a viewport.

## Tables and trees

Tables: `charm.land/lipgloss/v2/table` for rendered tables outside/inside Bubble Tea. Use `StyleFunc(row,col)` to emphasize headers, selected rows, negative values, etc.

Trees: `charm.land/lipgloss/v2/tree` for file trees, settings hierarchy, dependency graphs. v2 adds `IndenterStyle`, `IndenterStyleFunc`, and `Width`.

## Creative style recipes

- Use a 3-tone palette: base text, muted text, accent. Add semantic colors only when needed.
- Prefer whitespace over heavy borders; one strong border per screen is enough.
- Use badges for states: `RUNNING`, `FAILED`, `DIRTY`, `REMOTE`.
- Use `BorderForegroundBlend` for fancy gradient cards sparingly.
- Use underline styles/colors for links or focus rings.
- Make light/dark styles explicit; no hidden global adaptive renderer.

## Local examples to inspect

- Lip Gloss examples: `lipgloss/examples/{layout,canvas,table,tree,list,color,blending,brightness}`
- Bubble Tea layer/canvas examples: `bubbletea/examples/{canvas,clickable,space,doom-fire,eyes}`
- Upgrade/source: `lipgloss/UPGRADE_GUIDE_V2.md`, `lipgloss/layer.go`, `lipgloss/canvas.go`, `lipgloss/table`, `lipgloss/tree`
