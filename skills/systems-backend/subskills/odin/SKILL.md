---
name: odin
description: Use when writing, reviewing, debugging, or researching Odin programming language code, packages, tests, memory management, foreign bindings, or standard/vendor library usage.
---

# Odin Programming Language

## First Rule: Check Current Docs

Odin is pre-1.0 and monthly `dev-YYYY-MM` releases move. Before relying on syntax, flags, package APIs, or vendor bindings, check:

- Latest releases: https://github.com/odin-lang/Odin/releases
- Language docs: https://odin-lang.org/docs/
- Package docs: https://pkg.odin-lang.org/
- Compiler flags: https://github.com/odin-lang/Odin/wiki/Compiler-Flags

At skill creation time (2026-06-05), the latest observed release was `dev-2026-05`. Do not hard-code that as current in future work.

## Setup and Commands

```sh
odin version
odin run .                         # compile package directory and run
odin build .                       # compile package directory
odin check .                       # parse/check without producing executable
odin test .                        # run @(test) tests
odin build . -vet -strict-style -vet-tabs -disallow-do -warnings-as-errors
```

Odin builds directories as packages. All `.odin` files in a package directory need the same top-level `package` declaration. There are no headers or forward declarations.

## Package Imports

```odin
package main

import "core:fmt"
import os "core:os"

main :: proc() {
	fmt.println("Hellope!")
	_ = os.args
}
```

Library collections:

| Collection | Meaning |
|---|---|
| `base:*` | Required runtime/implementation library. Rarely import directly unless working near runtime/tooling. |
| `core:*` | Standard library for most programs. Prefer this first. |
| `vendor:*` | Shipped third-party bindings/ports for common systems libraries. Check platform/link requirements. |

## Standard Library Map

Use package docs for exact procedure names and signatures.

| Need | Start with |
|---|---|
| printing/formatting | `core:fmt` |
| files, dirs, process/env | `core:os`, `core:path/filepath`, `core:path/slashpath` |
| streams/buffered I/O | `core:io`, `core:bufio` |
| bytes/strings/text | `core:bytes`, `core:strings`, `core:text/*`, `core:unicode/*` |
| CLI flags | `core:flags` |
| JSON/CSV/XML/INI/base64/UUID | `core:encoding/*` |
| math/random/linear algebra | `core:math`, `core:math/rand`, `core:math/linalg` |
| slices/sorting | `core:slice`, `core:slice/heap`, `core:sort` |
| containers | `core:container/*` (`queue`, `priority_queue`, `lru`, `xar`, trees, pools) |
| memory/allocators | `core:mem`, `core:mem/virtual` |
| networking/non-blocking I/O | `core:net`, `core:nbio` |
| threads/sync/channels | `core:thread`, `core:sync`, `core:sync/chan` |
| testing | `core:testing` and `odin test` |
| logging | `core:log` via `context.logger` |
| images/compression/crypto | `core:image/*`, `core:compress/*`, `core:crypto/*` |
| runtime reflection | `core:reflect` |
| Odin tooling/parser | `core:odin/parser`, `core:odin/ast`, `core:odin/tokenizer` |
| platform syscalls/bindings | `core:sys/*` |

`vendor:*` includes bindings/ports such as `raylib`, `sdl2`, `sdl3`, `glfw`, `OpenGL`, `vulkan`, `wgpu`, `curl`, `miniaudio`, `lua/5.4`, `stb/*`, `zlib`, `box2d`, DirectX, Metal, Windows, X11, and more. Always verify current vendor docs and link instructions.

## Idioms and Style

Official examples prefer:

- Types and enum values: `Ada_Case`
- Procedures, imports, locals: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`
- Tabs for indentation; spaces only for alignment
- Opening brace at end of line
- Prefer inference: `value := make_thing()` over redundant type annotation
- Prefer compound initializers over zero-init then field assignment
- Compile cleanly with `-vet -strict-style -vet-tabs -disallow-do -warnings-as-errors`

```odin
Camera :: struct {
	position: [3]f32,
	offset:   [2]f32,
	zoom:     f32,
}

cam := Camera {
	position = {50, 50, 10},
	offset   = {10, 20},
	zoom     = 2,
}
```

## Language Practices

- Odin is procedural and data-oriented. There are no methods, classes, constructors, destructors, exceptions, operator overloading, or implicit numeric conversions.
- Keep data and procedures separate: `move_player(&player, dt)`, not `player.move(dt)`.
- Use multiple returns for errors: `value, err := do_thing(); if err != ... { ... }`.
- Use `for` for every loop shape; there is no `while`.
- `switch` breaks by default; use explicit `fallthrough` only when intended.
- `switch` over enums/unions is exhaustive by default; use `#partial switch` only when intentionally non-exhaustive.
- Use `when` for compile-time/platform branches.
- Prefer explicit conversions: `i32(x)`, `cast(^T)ptr`, `transmute` only when representation reinterpretation is intended.

## Memory and Lifetime Rules

Odin has no automatic memory management. Built-ins use `context.allocator` unless an allocator is supplied or stored by the type.

| Allocate/init | Release |
|---|---|
| `new(T)` | `free(ptr)` |
| `make([]T, n)` | `delete(slice)` |
| `make([dynamic]T)` | `delete(array)` |
| `make(map[K]V)` | `delete(map)` |

```odin
import "core:mem"

main :: proc() {
	arena: mem.Dynamic_Arena
	mem.dynamic_arena_init(&arena)
	defer mem.dynamic_arena_destroy(&arena)

	old_allocator := context.allocator
	context.allocator = mem.dynamic_arena_allocator(&arena)
	defer context.allocator = old_allocator

	items := make([dynamic]int)
	append(&items, 1)
	// Arena cleanup frees all arena allocations; do not double-delete arena-owned items.
}
```

Use `defer` when there are multiple exits and cleanup must happen. Do not overuse it for a single linear cleanup path.

## Testing

```odin
package mypkg

import "core:testing"

@(test)
addition_works :: proc(t: ^testing.T) {
	testing.expect_value(t, 2 + 2, 4)
}
```

Run `odin test .`. Useful test defineables:

```sh
odin test . -define:ODIN_TEST_NAMES=addition_works
odin test . -define:ODIN_TEST_FAIL_ON_BAD_MEMORY=true
odin test . -define:ODIN_TEST_ALWAYS_REPORT_MEMORY=true
```

For memory-heavy code, use current `core:testing` helpers such as `testing.expect_leaks` and check the package docs/source for exact verifier signatures.

## Common Traps

| Trap | What to do |
|---|---|
| Treating `::` constants like addressable/static data | `::` is compile-time. Use `@(rodata) NAME := ...` or a runtime variable if indexing/addressing with runtime values. |
| Forgetting cleanup | Pair `new/free`, `make/delete`, or use arenas deliberately. |
| Assuming slices own memory | Slices are views. Know who owns backing storage. |
| Copying arrays accidentally | Arrays are values; slices, dynamic arrays, and maps are reference-like descriptors. |
| Expecting methods/OO/UFCS | Write package procedures and pass pointers explicitly. |
| Expecting exceptions/try-catch | Return error values explicitly. |
| Expecting implicit numeric casts | Convert explicitly; default untyped float is `f64`, integer is `int`. |
| Misusing `transmute` | Prefer normal casts; use `transmute` only for representation-level reinterpretation. |
| Ignoring package semantics | Packages are libraries, not arbitrary namespace folders; avoid needless taxonomizing. |
| Assuming a package manager exists | Odin intentionally has no official package manager. Vendor dependencies manually/pin versions. |
| Using `core:os/old` | It is marked for removal; prefer current `core:os`. |
| Trusting old examples | Check current docs; APIs and flags can change before 1.0. |

## Foreign/Vendor Work

- Use `vendor:*` when available before writing bindings.
- Check OS/toolchain requirements: Windows uses MSVC/Windows SDK; Unix-like builds need clang/LLVM; WASM may need `wasm-ld`.
- Use `cstring`, `rawptr`, `proc "c"`, and `core:c`/`core:c/libc` deliberately at C boundaries.
- Keep unsafe pointer work isolated and documented; prefer slices and `core:mem` helpers over ad-hoc pointer arithmetic.

## Good References and Examples

- Docs landing page: https://odin-lang.org/docs/
- Overview/syntax tour: https://odin-lang.org/docs/overview/
- Demo file: https://odin-lang.org/docs/demo/
- Testing guide: https://odin-lang.org/docs/testing/
- FAQ/design rationale/traps: https://odin-lang.org/docs/faq/
- Install/toolchains: https://odin-lang.org/docs/install/
- Package docs: https://pkg.odin-lang.org/
- Core packages: https://pkg.odin-lang.org/core/
- Vendor packages: https://pkg.odin-lang.org/vendor/
- Releases/changelog: https://github.com/odin-lang/Odin/releases
- Compiler flags: https://github.com/odin-lang/Odin/wiki/Compiler-Flags
- Official examples: https://github.com/odin-lang/examples
- Examples style convention: https://github.com/odin-lang/examples/wiki/Naming-and-style-convention
- Odin by Example: https://gingerbill.gitbooks.io/odin-by-example/
- Odin book sample: https://odinbook.com/sample.html
