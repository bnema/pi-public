# Local Charm v2 examples index

Prefer these local examples before old blog snippets. Local clone root: `$HOME/dev/clone/charmbracelet`.

## Bubble Tea examples

Path root: `$HOME/dev/clone/charmbracelet/bubbletea/examples`.

| Task | Examples |
|---|---|
| minimal app | `simple`, `views`, `window-size` |
| commands/async/network | `http`, `realtime`, `send-msg`, `tui-daemon-combo`, `debounce`, `sequence` |
| keyboard v2 | `print-key`, `keyboard-enhancements`, `focus-blur`, `prevent-quit` |
| mouse/click/layers | `mouse`, `clickable`, `canvas` |
| terminal view fields | `fullscreen`, `altscreen-toggle`, `set-window-title`, `set-terminal-color`, `cursor-style`, `progress-bar` |
| inputs | `textinput`, `textinputs`, `textarea`, `dynamic-textarea`, `autocomplete`, `isbn-form` |
| lists/tables/pagers | `list-default`, `list-fancy`, `list-simple`, `table`, `table-resize`, `pager`, `paginator`, `file-picker` |
| loading/progress/time | `spinner`, `spinners`, `progress-animated`, `progress-download`, `progress-static`, `timer`, `stopwatch` |
| complex/polished | `chat`, `package-manager`, `split-editors`, `glamour`, `tabs`, `splash` |
| visual/playful | `doom-fire`, `eyes`, `space`, `cellbuffer` |
| external process/pipe | `exec`, `pipe`, `suspend` |

Also read `bubbletea/tutorials/basics` and `bubbletea/tutorials/commands`.

## Bubbles component source

Path root: `$HOME/dev/clone/charmbracelet/bubbles`.

- `textinput`: one-line input, suggestions, real/virtual cursor.
- `textarea`: multiline input, line numbers, styles, real/virtual cursor.
- `list`: item delegate, filtering, status, spinner, pagination.
- `viewport`: scrolling, soft wrap, gutters, highlights, line styles.
- `table`: rows/columns/keymap/viewport integration.
- `progress`: blended/scaled color progress bars.
- `spinner`, `timer`, `stopwatch`: animation/time models.
- `help`, `key`: discoverable keybinding views.
- `filepicker`, `paginator`, `cursor`: focused reusable pieces.

Upgrade guide: `bubbles/UPGRADE_GUIDE_V2.md`.

## Lip Gloss examples

Path root: `$HOME/dev/clone/charmbracelet/lipgloss/examples`.

| Task | Examples/source |
|---|---|
| layout/panes | `layout`, plus `join.go`, `position.go` |
| layers/canvas | `canvas`, `layer.go`, `canvas.go` |
| tables | `table`, package `lipgloss/table` |
| trees | `tree`, package `lipgloss/tree` |
| colors | `color`, `blending`, `brightness`, `compat` |
| lists/SSH | `list`, `ssh` |

Upgrade guide: `lipgloss/UPGRADE_GUIDE_V2.md`.

## Huh examples

Path root: `$HOME/dev/clone/charmbracelet/huh/examples`.

| Task | Examples |
|---|---|
| simple/readme | `readme`, `burger`, `gum` |
| dynamic/conditional forms | `dynamic`, `conditional`, `multiple-groups`, `skip` |
| themed/layout | `theme`, `layout`, `stickers`, `help` |
| GitHub/Git flows | `gh`, `git` |
| file picking | `filepicker`, `filepicker-picking` |
| Bubble Tea integration | `bubbletea`, `bubbletea-options` |
| async/spinner/timer | `spinner`, `timer` |
| accessibility/SSH | `accessibility`, `accessibility-secure-input`, `ssh-form` |

Upgrade guide: `huh/UPGRADE_GUIDE_V2.md`; overview: `huh/README.md`.

## Quick commands

```bash
rtk grep -n "tea.NewView\|KeyPressMsg\|MouseClickMsg\|OnMouse\|RequestBackgroundColor" $HOME/dev/clone/charmbracelet/bubbletea/examples
rtk grep -n "SetWidth\|DefaultStyles\|SetVirtualCursor\|SoftWrap\|SetHighlights" $HOME/dev/clone/charmbracelet/bubbles
rtk grep -n "NewLayer\|NewCompositor\|LightDark\|JoinHorizontal\|Place(" $HOME/dev/clone/charmbracelet/lipgloss
```
