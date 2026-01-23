#!/usr/bin/env bash
# Run vitest unit tests with output truncated to last 30 lines
# Usage: run-unit-tests.sh [pattern]

set -euo pipefail

# Navigate to git root
cd "$(git rev-parse --show-toplevel)"

# Capture output and exit code
output_file=$(mktemp)
exit_code=0

if [ $# -eq 0 ]; then
  # Run all tests
  bun run test > "$output_file" 2>&1 || exit_code=$?
else
  # Run tests matching pattern - use turbo -F and -- to pass filter through
  bun run turbo run test:run -F web -- "$1" > "$output_file" 2>&1 || exit_code=$?
fi

# Count total lines
total_lines=$(wc -l < "$output_file")

# Show truncation notice if needed
if [ "$total_lines" -gt 30 ]; then
  echo "Output truncated: showing last 30 of $total_lines lines"
  echo "---"
fi

# Show last 30 lines
tail -n 30 "$output_file"

# Cleanup
rm "$output_file"

# Preserve exit code
exit $exit_code
