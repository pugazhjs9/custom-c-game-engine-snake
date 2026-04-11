#include "../include/memory.h"

/*
 * memory.c — Fixed-pool allocator using a linked list of blocks
 *
 * Memory Layout:
 * ┌──────────────────────────────────────────────────────────┐
 * ├────────────┬────────────┬────────────┬────────────┬──────┤
 * │ BlockHeader│  user data │ BlockHeader│  user data │ ...  │
 * │ (metadata) │  (size B)  │ (metadata) │  (size B)  │      │
 * └────────────┴────────────┴────────────┴────────────┴──────┘
 *
 * Each allocation is preceded by a BlockHeader that tracks:
 *   - size:  number of usable bytes in this block
 *   - free:  1 = available, 0 = in use
 *   - next:  pointer to the next BlockHeader (or 0 if last)
 *
 * On init, the entire pool is one large free block.
 * mem_alloc() walks the list (first-fit) and splits blocks.
 * mem_free() marks a block free and merges adjacent free blocks.
 */

/* ── Configuration ── */

#define POOL_SIZE 65536  /* 64 KB memory pool */

/* ── Block header ── */

typedef struct BlockHeader {
    int                  size;  /* usable bytes (excluding header) */
    int                  free;  /* 1 = free, 0 = allocated         */
    struct BlockHeader  *next;  /* next block in the list           */
} BlockHeader;

/* ── Globals ── */

static char         pool[POOL_SIZE];  /* raw memory pool          */
static BlockHeader *head;             /* head of the block list   */

/* ── Helpers ── */

#define HEADER_SIZE  ((int)sizeof(BlockHeader))

/*
 * split_block — If `block` has more space than needed, carve out
 *               a new free block from the remainder.
 */
static void split_block(BlockHeader *block, int size) {
    int remaining = block->size - size - HEADER_SIZE;

    /* only split if the remainder can hold at least 1 byte */
    if (remaining > 0) {
        BlockHeader *new_block = (BlockHeader *)((char *)block + HEADER_SIZE + size);
        new_block->size = remaining;
        new_block->free = 1;
        new_block->next = block->next;

        block->size = size;
        block->next = new_block;
    }
}

/*
 * merge_free — Walk the list and coalesce adjacent free blocks.
 */
static void merge_free(void) {
    BlockHeader *curr = head;

    while (curr && curr->next) {
        if (curr->free && curr->next->free) {
            curr->size += HEADER_SIZE + curr->next->size;
            curr->next  = curr->next->next;
            /* don't advance — check if the merged block can merge again */
        } else {
            curr = curr->next;
        }
    }
}

/* ── Public API ── */

void mem_init(void) {
    head       = (BlockHeader *)pool;
    head->size = POOL_SIZE - HEADER_SIZE;
    head->free = 1;
    head->next = (BlockHeader *)0;
}

void *mem_alloc(int size) {
    BlockHeader *curr;

    if (size <= 0) {
        return (void *)0;
    }

    /* first-fit search */
    curr = head;
    while (curr) {
        if (curr->free && curr->size >= size) {
            split_block(curr, size);
            curr->free = 0;
            /* return pointer just past the header */
            return (void *)((char *)curr + HEADER_SIZE);
        }
        curr = curr->next;
    }

    /* out of memory */
    return (void *)0;
}

void mem_free(void *ptr) {
    BlockHeader *block;

    if (!ptr) {
        return;
    }

    /* step back to the header */
    block = (BlockHeader *)((char *)ptr - HEADER_SIZE);
    block->free = 1;

    /* coalesce adjacent free blocks */
    merge_free();
}
