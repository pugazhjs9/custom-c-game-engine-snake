# ──────────────────────────────────────────────
# Snake Game — Makefile
# ──────────────────────────────────────────────

CC       = gcc
CFLAGS   = -Wall -Wextra -pedantic -std=c99 -I include
LDFLAGS  =

SRC_DIR  = src
INC_DIR  = include
BUILD_DIR= build

SRCS     = $(wildcard $(SRC_DIR)/*.c)
OBJS     = $(patsubst $(SRC_DIR)/%.c, $(BUILD_DIR)/%.o, $(SRCS))
TARGET   = snake

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $^

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c -o $@ $<

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

clean:
	rm -rf $(BUILD_DIR) $(TARGET)
