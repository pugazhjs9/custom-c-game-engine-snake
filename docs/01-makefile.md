# 01 — The Makefile (build system)

> **In one sentence:** `make` reads a recipe (the `Makefile`), figures out which files have changed, and compiles only what's needed — turning 10 `.c` files into one `./snake` binary.

---

## What is `make`?

In Python you just `python script.py` and it runs.
In C you must:

1. **Compile** each `.c` file → `.o` (object file)
2. **Link** all `.o` files → one binary

If you have 10 `.c` files, you'd type 11 commands every time. **Insane.** `make` automates this.

---

## Why we need it

- **Smart rebuilds.** If you only edit `game.c`, `make` only recompiles `game.o` and re-links. Editing one file ≠ recompiling everything.
- **Header tracking.** If you change `game.h`, **every file that includes it** must recompile. We use a flag (`-MMD -MP`) that auto-generates these dependencies.
- **One command.** `make` builds, `make clean` deletes outputs.

---

## The full file (annotated)

```make
CC       = gcc                                              # ① The compiler
CFLAGS   = -Wall -Wextra -pedantic -std=c99 \
           -D_DEFAULT_SOURCE -I include -MMD -MP            # ② Compile flags
LDFLAGS  =                                                  # ③ Link flags (none needed)

SRC_DIR  = src                                              # ④ Where .c files live
INC_DIR  = include                                          # where .h files live
BUILD_DIR= build                                            # where .o files go

SRCS     = $(wildcard $(SRC_DIR)/*.c)                       # ⑤ All .c files
OBJS     = $(patsubst $(SRC_DIR)/%.c, $(BUILD_DIR)/%.o, $(SRCS))  # ⑥ Convert names
DEPS     = $(OBJS:.o=.d)                                    # ⑦ Dependency files
TARGET   = snake                                            # ⑧ Output binary name

.PHONY: all clean                                           # ⑨ "Not real files"

all: $(TARGET)                                              # ⑩ Default goal

$(TARGET): $(OBJS)                                          # ⑪ Link rule
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $^

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)             # ⑫ Compile rule
	$(CC) $(CFLAGS) -c -o $@ $<

$(BUILD_DIR):                                               # ⑬ Make sure folder exists
	mkdir -p $(BUILD_DIR)

-include $(DEPS)                                            # ⑭ Auto-generated header deps

clean:                                                      # ⑮ Clean rule
	rm -rf $(BUILD_DIR) $(TARGET)
```

### Line-by-line breakdown

**① `CC = gcc`** — The C compiler. Could also be `clang`.

**② `CFLAGS`** — Flags passed every time we compile:
- `-Wall -Wextra -pedantic` → enable **all** warnings (catch bugs early).
- `-std=c99` → use the 1999 C standard.
- `-D_DEFAULT_SOURCE` → enables some POSIX features (we need `usleep`, `fcntl` etc.)
- `-I include` → "look in `include/` folder when resolving `#include`".
- `-MMD -MP` → **auto-generate** `.d` files describing which `.h` each `.c` includes. This is the magic that makes header changes trigger correct rebuilds.

**⑤ `SRCS = $(wildcard src/*.c)`** — `make` expands `$(wildcard ...)` to the list of all `.c` files in `src/`. Equivalent to `ls src/*.c`.

**⑥ `OBJS = $(patsubst src/%.c, build/%.o, $(SRCS))`** — Pattern substitution. Takes `src/foo.c` and rewrites it as `build/foo.o`. Now `OBJS` is the list of all object files we want to build.

**⑩ `all: $(TARGET)`** — When you type `make` with no argument, the **first rule** runs. This says "to make `all`, you need `snake`". So it triggers rule ⑪.

**⑪ The link rule:**
```
$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $^
```
- `snake: build/main.o build/game.o ...` — to make `snake`, we need all these `.o` files.
- `$@` = the target (`snake`)
- `$^` = all the prerequisites (all `.o` files)
- This expands to: `gcc -Wall ... -o snake build/main.o build/game.o ...`

**⑫ The compile rule:**
```
build/%.o: src/%.c | build
	$(CC) $(CFLAGS) -c -o $@ $<
```
- `%` is a wildcard. `build/foo.o` depends on `src/foo.c`.
- The `| build` means "build directory must exist first" but isn't a real dependency.
- `$<` = the **first** prerequisite (the `.c` file).
- `-c` tells gcc "compile only, don't link yet".

**⑭ `-include $(DEPS)`** — pulls in all the auto-generated `.d` files which look like:
```
build/game.o: src/game.c include/game.h include/memory.h ...
```
Now `make` knows: "if `game.h` changes, rebuild `game.o`."

---

## What happens when you type `make`?

```
$ make
gcc -Wall ... -c -o build/ai.o src/ai.c
gcc -Wall ... -c -o build/game.o src/game.c
gcc -Wall ... -c -o build/keyboard.o src/keyboard.c
... (one line per .c file)
gcc -Wall ... -o snake build/ai.o build/game.o ...
```

Each `.c` becomes a `.o` (compiling), then they're all linked together (linking) into the final `snake` executable.

### Diagram

```
src/ai.c        ──gcc -c──→  build/ai.o      ─┐
src/game.c      ──gcc -c──→  build/game.o    ─┤
src/keyboard.c  ──gcc -c──→  build/keyboard.o ─┤
src/main.c      ──gcc -c──→  build/main.o    ─┼──gcc──→  ./snake
src/math.c      ──gcc -c──→  build/math.o    ─┤  (link)
src/memory.c    ──gcc -c──→  build/memory.o  ─┤
... etc                                       ─┘
```

---

## Common commands

```bash
make            # build (only what changed)
make clean      # delete build/ and ./snake
make clean && make   # full rebuild from scratch
```

---

## Lesson learned (from the PRD)

> "Header dependency tracking — Makefile now uses `-MMD -MP`, so editing a header forces all dependents to rebuild. (Found this the hard way during a stale-`.o` debugging session.)"

Without `-MMD -MP`, if you edit `game.h`, `make` would NOT rebuild `game.c` (because `game.c` itself didn't change). You'd run a binary with **two different layouts** of the `Game` struct in different `.o` files — random crashes. The `-MMD -MP` flags fix this by auto-tracking header dependencies.

---

## 📢 Presentation Script — "The Makefile"

> "Unlike Python where you just run a script, in C we have to compile. We have ten `.c` files, so without help we'd be running 11 commands every change.
>
> The `Makefile` automates this. The key idea is **smart rebuilds**: if I only edit `game.c`, only `game.o` recompiles, and then we re-link. Builds stay fast.
>
> Two flags I want to call out: `-Wall -Wextra` cranks warnings to the maximum so the compiler nags us before bugs ship. And `-MMD -MP` auto-generates dependency files — this means if I edit `game.h`, every `.c` that includes it gets rebuilt. We learned that one the hard way during development.
>
> One command — `make` — and we get `./snake`."

---

✅ Next: [`02-memory.md`](02-memory.md) — writing our own `malloc`.
