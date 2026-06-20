# Huh v2 sub-skill

Use this for forms, prompts, wizards, field validation, accessible mode, themes, and embedding forms in Bubble Tea apps.

## Imports

```go
import "charm.land/huh/v2"
import "charm.land/huh/v2/spinner"
```

Huh v2 requires Bubble Tea v2, Bubbles v2, and Lip Gloss v2. Keep all Charm imports on `charm.land/.../v2`.

## When to choose Huh vs Bubbles

| Use Huh when | Use Bubbles directly when |
|---|---|
| linear form/wizard prompt | custom dashboard/layout |
| validation and field groups matter | interaction model is not form-shaped |
| CLI setup/config questions | highly animated or mouse-heavy UI |
| accessible prompt mode matters | you need full custom component behavior |

## Basic form pattern

```go
var name string
var confirm bool

form := huh.NewForm(
    huh.NewGroup(
        huh.NewInput().Title("Project name").Value(&name).Validate(func(s string) error {
            if s == "" { return fmt.Errorf("name required") }
            return nil
        }),
        huh.NewConfirm().Title("Create it?").Value(&confirm),
    ),
).WithTheme(huh.ThemeFunc(huh.ThemeCharm)).WithAccessible(false)

if err := form.Run(); err != nil { return err }
```

## v2 theme/accessibility changes

| v1 habit | v2 rule |
|---|---|
| `huh.ThemeCharm()` passed directly | `huh.ThemeFunc(huh.ThemeCharm)` |
| custom `Theme` struct | implement `huh.Theme`, usually `huh.ThemeFunc(func(isDark bool) *huh.Styles { ... })` |
| field `.WithAccessible(true)` | only `form.WithAccessible(true)` |
| `huh/accessibility` package | removed |

Built-in theme functions take `isDark bool` internally, but `WithTheme` expects `huh.Theme`; wrap built-ins with `huh.ThemeFunc`: `huh.ThemeFunc(huh.ThemeCharm)`, `huh.ThemeFunc(huh.ThemeDracula)`, etc.

## Bubble Tea embedding

Do not assume `*huh.Form` directly satisfies Bubble Tea v2 `tea.Model`: Huh's compat model renders `View() string`. In a parent Bubble Tea v2 app, store `*huh.Form`, delegate `Init`/`Update`, type-assert the returned model back to `*huh.Form`, and wrap `form.View()` with `tea.NewView(...)` in the parent.

```go
func (m model) Init() tea.Cmd { return m.form.Init() }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    form, cmd := m.form.Update(msg)
    if f, ok := form.(*huh.Form); ok { m.form = f }
    if m.form.State == huh.StateCompleted { return m, tea.Batch(cmd, tea.Quit) }
    return m, cmd
}

func (m model) View() tea.View { return tea.NewView(m.form.View()) }
```

Use `WithViewHook` for standalone `form.Run()` flows that need Bubble Tea v2 view fields:

```go
form := huh.NewForm(groups...).WithTheme(huh.ThemeFunc(huh.ThemeCharm)).WithViewHook(func(v tea.View) tea.View {
    v.AltScreen = true
    v.WindowTitle = "Setup"
    return v
})
```

Useful for full-screen forms, SSH apps, mouse mode, or consistent window titles.

## Creative Huh patterns

- setup wizard: groups as steps; `Confirm` gates destructive action
- dynamic forms: rebuild groups from discovered project metadata
- mixed app: launch Huh form to configure filters, then return to custom Bubble Tea dashboard
- Git/PR helper: Huh selects branch/type/scope, Bubbles viewport previews generated text
- deployment wizard: Huh validates fields, spinner runs network operation, Bubble Tea progress shows status
- accessible fallback: detect env/user flag and use `WithAccessible(true)` for screen-reader-friendly prompts

## Local examples

- `huh/examples/{readme,burger,git,gh,gum,dynamic,conditional,multiple-groups,theme,layout}`
- Bubble Tea integration: `huh/examples/{bubbletea,bubbletea-options}`
- Files/spinner/SSH: `huh/examples/{filepicker,filepicker-picking,spinner,ssh-form}`
- Upgrade/source: `huh/UPGRADE_GUIDE_V2.md`, `huh/README.md`
