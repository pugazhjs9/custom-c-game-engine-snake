# 02 — Memory: A Hand-Rolled Allocator

> **In one sentence:** Instead of using `malloc` and `free`, we reserve a 64 KB chunk of memory at startup and write our own bookkeeping system to hand out pieces of it.

---

## What is this module?

`memory.c` / `memory.h` provide:

| Function | Equivalent in Python | What it does |
|---|---|---|
| `mem_init()` | (automatic) | Sets up the memory pool |
| `mem_alloc(n)` | `bytearray(n)` | Returns a pointer to `n` free bytes |
| `mem_free(p)` | (garbage collection) | Returns those bytes to the pool |

In a normal C program you'd use `malloc(n)` from `<stdlib.h>`. We deliberately **don't**, to learn how `malloc` actually works.

---

## Why on earth would we do this?

1. **Educational** — you'll never look at `malloc` the same way again.
2. **Predictable** — fixed 64 KB pool, no surprise OS calls.
3. **No external dependencies** — pure C; no `<stdlib.h>` needed for memory.
4. **Embedded systems** — real-world: when you write firmware for a microcontroller, you literally have to do this.

---

## The big picture

We grab one big array of bytes:
```c
static char pool[65536];   // 64 KB. Lives in the data segment.
```
Then we **track which parts are free vs in use** using a **linked list of headers** sitting *inside* the pool itself.

### Memory layout

```
pool[]   start                                                            end
   ├──────────────────────────────────────────────────────────────────────┤
   │ Header │ user data │ Header │ user data │ Header │ free space ...    │
   │ (16B)  │ (size B)  │ (16B)  │ (size B)  │ (16B)  │                   │
   └────────┴───────────┴────────┴───────────┴────────┴───────────────────┘
       │                    │                    │
       │                    │                    └─→ next = NULL
       │                    └─→ next = (third header)
       └─→ next = (second header)
```

Each `BlockHeader` says: "I'm 40 bytes, I'm free, and the next block is at address X."

When you call `mem_alloc(20)`:
1. Walk the list looking for a **free** block of at least 20 bytes.
2. Mark it `free = 0`.
3. If it's much bigger, **split** it: shrink to 20, create a new free header in the leftover.
4. Return a pointer **just past** the header (so the caller doesn't see our bookkeeping).

When you call `mem_free(p)`:
1. Step backwards by `sizeof(BlockHeader)` to find the header.
2. Mark `free = 1`.
3. **Merge** with adjacent free neighbours so we don't get fragmented.

---

## The header struct

```c
typedef struct BlockHeader {
    int                  size;  // usable bytes (NOT including this header)
    int                  free;  // 1 = available, 0 = in use
    struct BlockHeader  *next;  // address of the next block
} BlockHeader;
```

Three fields: how big I am, am I free, and where's the next block. That's the **entire data structure**.

---

## Code walkthrough

### `mem_init()` — set up one giant free block

```c
void mem_init(void) {
    head       = (BlockHeader *)pool;          // (1) point head at byte 0
    head->size = POOL_SIZE - HEADER_SIZE;      // (2) usable = total - header
    head->free = 1;                            // (3) all free
    head->next = (BlockHeader *)0;             // (4) only one block, no next
}
```

(1) The trick: we **cast the byte array's address into a `BlockHeader *`**. Now `head` thinks it points to a struct, but actually it's pointing to the start of `pool[]`. Writing to `head->size` writes into `pool[0..3]`. **C lets you do this** — types are just lenses on raw bytes.

After init, the pool looks like:
```
pool: [Header(size=65520, free=1, next=NULL)] [65520 bytes of free space ...]
```

### `mem_alloc(int size)` — first-fit search

```c
void *mem_alloc(int size) {
    BlockHeader *curr;
    if (size <= 0) return (void *)0;

    curr = head;
    while (curr) {
        if (curr->free && curr->size >= size) {       // (1) found a fit
            split_block(curr, size);                  // (2) carve off remainder
            curr->free = 0;                           // (3) mark used
            return (void *)((char *)curr + HEADER_SIZE);  // (4) skip header
        }
        curr = curr->next;
    }
    return (void *)0;   // out of memory
}
```

(1) **First-fit**: scan blocks, take the first free one that's big enough. (Other strategies exist: best-fit, worst-fit, buddy allocators.)

(4) We return `curr + HEADER_SIZE`. The caller has no idea about the header sitting just behind their pointer. Beautiful and dangerous.

### `split_block` — don't waste big blocks

```c
static void split_block(BlockHeader *block, int size) {
    int remaining = block->size - size - HEADER_SIZE;
    if (remaining > 0) {
        BlockHeader *new_block =
            (BlockHeader *)((char *)block + HEADER_SIZE + size);
        new_block->size = remaining;
        new_block->free = 1;
        new_block->next = block->next;

        block->size = size;
        block->next = new_block;
    }
}
```

If the request is 20 bytes but we found a free block of 65520, we split it: 20 bytes used, leftover 65520−20−16=65484 bytes becomes a new free block. Pointer arithmetic does the placement: `block + HEADER_SIZE + size` lands exactly at the start of the leftover region.

### Visualization of allocation

```
Before mem_alloc(20):
[H:65520 free] [─────────────── 65520 free bytes ───────────────]

After mem_alloc(20):     ┌─ returned to caller
[H:20 used] [20 user] [H:65484 free] [───── 65484 free ─────]
                ▲
            split made a new header here
```

### `mem_free(p)` — flip the bit and merge

```c
void mem_free(void *ptr) {
    BlockHeader *block;
    if (!ptr) return;

    block = (BlockHeader *)((char *)ptr - HEADER_SIZE);  // step back to header
    block->free = 1;
    merge_free();
}
```

Step back 16 bytes from the user's pointer → that's our header. Flip `free` to 1. Then call `merge_free` to coalesce adjacent free blocks (otherwise we'd fragment over time).

### `merge_free()` — defragmentation

```c
static void merge_free(void) {
    BlockHeader *curr = head;
    while (curr && curr->next) {
        if (curr->free && curr->next->free) {
            curr->size += HEADER_SIZE + curr->next->size;
            curr->next  = curr->next->next;
            // don't advance — re-check in case we can merge again
        } else {
            curr = curr->next;
        }
    }
}
```

Walk the list. If two consecutive blocks are both free, **eat the second one**: extend `curr->size` and skip over `curr->next`. The header that was there is now just part of the user-data of the merged block.

---

## A worked example

```c
mem_init();                  // [F:65520]
void *a = mem_alloc(100);    // [U:100][F:65404]
void *b = mem_alloc(50);     // [U:100][U:50][F:65338]
mem_free(a);                 // [F:100][U:50][F:65338]
mem_free(b);                 // [F:100][F:50][F:65338]
                             // → merge_free runs:
                             // [F:166][F:65338]    (first merge)
                             // [F:65520]           (second merge)
```

Back to where we started. **No leak, no fragmentation.**

---

## What's used in this project?

The snake's body is the main customer. Every time the snake grows:
```c
Segment *seg = (Segment *)mem_alloc(sizeof(Segment));   // ~16 bytes
```
And every time the tail moves (no growth), the tail segment gets `mem_free`'d. The pool is huge relative to the game (max 600 segments × 16 bytes = under 10 KB), so we never run out.

---

## Limits / caveats (intentional)

- **Fixed 64 KB.** No `realloc`, no growing the pool. If you tried to make a 70 KB game, this would `return NULL`.
- **First-fit fragmentation.** Pathological alloc/free patterns could fragment, but our merge step keeps it tame.
- **No alignment.** A real allocator aligns to 8 or 16 bytes. We get away with it because all our structs are int-aligned anyway.

---

## 📢 Presentation Script — "Memory"

> "We banned `malloc`. Why? Because we wanted to understand it. So at startup we grab one 64 KB byte array — that's our entire memory budget — and we manage it ourselves.
>
> The trick is a **linked list of headers**. Each header sits in the pool right before a block of user data and says: 'I'm this big, I'm free or used, and the next block is over there.'
>
> When you ask for 20 bytes, we walk the list, find the first free block big enough, optionally split off the remainder into a new free block, and hand back a pointer that **skips past our header** — so the caller never sees our bookkeeping.
>
> When you free, we step back 16 bytes to find our header, flip the 'free' bit, and merge with any free neighbours so we don't fragment over time.
>
> The whole module is **about 80 lines of C**. That's all `malloc` is, conceptually."

---

✅ Next: [`03-math.md`](03-math.md) — math without `<math.h>`.
