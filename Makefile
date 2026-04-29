# ──────────────────────────────────────────────
# Snake Game — Makefile
# ──────────────────────────────────────────────

CC       = gcc
CFLAGS   = -Wall -Wextra -pedantic -std=c99 -D_DEFAULT_SOURCE -I include -MMD -MP
LDFLAGS  =

SRC_DIR  = src
INC_DIR  = include
BUILD_DIR= build

SRCS     = $(wildcard $(SRC_DIR)/*.c)
OBJS     = $(patsubst $(SRC_DIR)/%.c, $(BUILD_DIR)/%.o, $(SRCS))
DEPS     = $(OBJS:.o=.d)
TARGET   = snake

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $^

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c -o $@ $<

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

-include $(DEPS)

clean:
	rm -rf $(BUILD_DIR) $(TARGET)
