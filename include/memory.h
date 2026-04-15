#ifndef MEMORY_H
#define MEMORY_H

/* ── Fixed-pool allocator (no malloc/free) ── */

void  mem_init(void);                              /* initialize the memory pool          */
void *mem_alloc(int size);                         /* allocate `size` bytes from the pool */
void  mem_free(void *ptr);                         /* return a block to the pool          */

#endif /* MEMORY_H */
