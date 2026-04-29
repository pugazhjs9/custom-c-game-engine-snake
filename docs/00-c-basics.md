# 00 — C Survival Kit (for Python / JS devs)

> **Read this first.** Every other doc assumes you understand the concepts here.
> If you've only used Python or JS, C will feel **alien for the first 30 minutes** — and then "click" all at once. This file is the fastest path to that click.

---

## 1. The biggest mental shift

| Python / JS | C |
|---|---|
| Variables hold **objects** | Variables hold **raw bytes at a memory address** |
| `len(arr)` works automatically | The compiler has **no idea** how long an array is — you must track it |
| Garbage collector cleans up | **You** allocate and **you** free. Forget once → memory leak |
| `import math` | `#include "math.h"` literally **pastes** the file in |
| Run the script | **Compile** to a binary, then run the binary |
| `True`, `False` | `1`, `0` (any non-zero is true) |

In C, **a variable is just a labelled box of bytes**. There is nothing else. No prototype chain, no `__dict__`, no methods on the value. If you want a method, you write a function and pass the value in.

---

## 2. Types — they actually matter

```c
int   x = 42;        // 4 bytes, signed integer
char  c = 'A';       // 1 byte. Yes, a character IS just a small integer (65)
char *s = "Hello";   // pointer to a sequence of chars ending in '\0'
int   arr[10];       // 10 ints sitting next to each other in memory
```

**Important:** `char` and `int` are interchangeable in arithmetic. `'A' + 1 == 'B'` because `'A'` is just `65`.

### Strings are just `char` arrays ending in `0`

There's no `String` type. A "string" is `char *` (pointer to first character) and the **only** way to know where it ends is the special `'\0'` (zero) byte.

```c
char *name = "Bob";
//                B   o   b  \0     ← the \0 is invisible but mandatory
```

This is why our `string.c` exists — Python's `len("Bob")` is replaced by walking the char array until we see `\0`.

---

## 3. Pointers — the scary one

A pointer is **just a number**. That number is a memory address.

```c
int   x = 42;       // x lives somewhere, e.g., at address 0x1000
int  *p = &x;       // p holds the value 0x1000  (& means "address of")
*p = 99;            // "go to address p, write 99 there" → x is now 99
```

### Diagram

```
Memory:
  address  value
  ───────  ─────
  0x1000     42      ← x lives here
  0x1004   0x1000    ← p lives here, and it stores x's address

After   *p = 99:
  0x1000     99      ← x is now 99 (we wrote through the pointer)
  0x1004   0x1000    ← p didn't change
```

### Why pointers everywhere in this codebase?

1. **Pass-by-reference.** Functions that need to *modify* their argument take a pointer:
   ```c
   void game_init(Game *g);     // g is a pointer; the function modifies the original
   ```
   Compare to Python where mutating `self` works automatically.

2. **Arrays decay to pointers.** Passing an array passes its first-element address.

3. **Dynamic data structures.** A linked-list node has a `next` pointer to another node — that's how we build the snake.

### The 3 pointer operators you'll see

| Operator | Meaning | Example |
|---|---|---|
| `&x` | "address of x" (gives a pointer) | `int *p = &x;` |
| `*p` | "value at address p" (dereference) | `*p = 99;` |
| `p->field` | shortcut for `(*p).field` | `node->next` |

---

## 4. Structs — like a class with no methods

```c
typedef struct Segment {
    int x;
    int y;
    struct Segment *next;
} Segment;
```

That's our snake segment. It is **literally** 12 bytes of memory: 4 for `x`, 4 for `y`, 8 for the `next` pointer.

To use it:

```c
Segment s;
s.x = 10;        // dot when you have the struct value
s.y = 20;

Segment *p = &s;
p->x = 11;       // arrow when you have a pointer to it
```

**No methods** — if you want `s.draw()`, you write `draw(&s)`.

---

## 5. Headers — the world's dumbest import

When you write `#include "math.h"`, the compiler **literally pastes the entire `math.h` file** at that location before compiling. No more, no less.

So **`.h` files** contain **declarations** (just the signatures):
```c
int math_clamp(int x, int lo, int hi);   // "this function exists somewhere"
```

And **`.c` files** contain **definitions** (the actual code):
```c
int math_clamp(int x, int lo, int hi) {
    if (x < lo) return lo;
    ...
}
```

### Why split?

- The `.h` file is the **public API** anyone can `#include`.
- The `.c` file is **private implementation**.
- The compiler compiles each `.c` to a `.o` separately, then the **linker** glues them together at the end.

### The `#ifndef` guard

Every `.h` starts with:
```c
#ifndef MATH_H
#define MATH_H
... declarations ...
#endif
```

This prevents the file from being pasted in **twice** if it's included from multiple places (which would cause "duplicate definition" errors). Think of it as `if not already_imported: import this`.

---

## 6. Memory: stack vs heap

```c
void f(void) {
    int   x;          // STACK — auto-cleaned when f returns
    int  *p;          // STACK — the pointer itself
    p = mem_alloc(8); // HEAP  — survives until you mem_free(p)
}
```

- **Stack** = local variables. Free, fast, automatically freed.
- **Heap** = explicit `malloc` / our `mem_alloc`. You **must** call `free` / `mem_free` or leak.

In Python you never think about this. In C, the snake's body lives on the heap (each segment is `mem_alloc`'d) because it grows over time.

---

## 7. The compilation pipeline

```
   foo.c ─┐                                    ┌─→ foo.o ─┐
   bar.c ─┼─[preprocessor: paste #includes]─→ ┼─→ bar.o ─┼─[linker]─→ binary
   baz.c ─┘                                    └─→ baz.o ─┘
                  ↑
                  these are .c files with all #includes pasted in
```

1. **Preprocessor** runs first — handles `#include`, `#define`, `#ifndef`.
2. **Compiler** turns each `.c` into a `.o` (object file = machine code, but with unresolved function names).
3. **Linker** glues all `.o` files together, resolving function calls between them. The result is the executable `./snake`.

`make` automates this. You'll see how in [`01-makefile.md`](01-makefile.md).

---

## 8. Things that will trip you up

1. **`=` is assignment, `==` is comparison.** `if (x = 0)` compiles fine and **always evaluates the assignment** — a classic bug.
2. **Array indexing is unchecked.** `arr[1000]` on a 10-element array does NOT throw — it reads garbage memory or crashes.
3. **`char*` vs `char[]`.** `"hello"` is a string literal; modifying it is undefined behavior.
4. **No exceptions.** Errors are returned as `int` codes (`-1`, `0`, etc.) — you check by hand.
5. **No `print(x)`.** You use `printf("%d", x)` and you'd better get the format specifier right.

---

## 9. The handful of syntax you'll see in this project

```c
// Function pointer types you can ignore for now.

// for-loop (same as Python's range)
for (int i = 0; i < 10; i++) { ... }

// while-loop
while (curr) { curr = curr->next; }   // walk a linked list

// switch (cleaner if/else if)
switch (key) {
    case 'w': ... break;
    case 's': ... break;
    default:  ... break;
}

// typedef enum — named integer constants
typedef enum { DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT } Direction;
// DIR_UP = 0, DIR_DOWN = 1, etc.

// (void *)0 means "null pointer". Same as NULL.
```

---

## 📢 Presentation Script — "Why C is different"

> "Before I walk through the code, let me set the stage. C is fundamentally different from Python or JavaScript in three ways.
>
> **One: there is no garbage collector.** Every byte of memory we use, we have to ask for and we have to give back. If we forget to give it back, that's a leak. In Python you can `[1,2,3]` all day; in C, that array sits in memory until you free it.
>
> **Two: a string isn't a string.** It's a sequence of bytes ending in zero. We have to walk it byte-by-byte to find its length. That's why we have a whole `string.c` file with our own `str_len`.
>
> **Three: you compile, you don't run.** I write `make`, and a tool reads all my `.c` files, turns each into machine code, and links them into one binary called `./snake`. There's no interpreter at runtime.
>
> Once you accept these three things, the rest of C is just careful bookkeeping — and that's exactly what this project is: a master class in careful bookkeeping."

---

✅ **You're ready.** Next: [`01-makefile.md`](01-makefile.md) — how all these files become one program.
