#!/usr/bin/env bash
# Run Playwright E2E tests with output truncated to last 30 lines
# Usage: run-e2e-tests.sh [spec-file]

set -euo pipefail

# Navigate to git root
cd "$(git rev-parse --show-toplevel)"

# Capture output and exit code
output_file=$(mktemp)
exit_code=0

if [ $# -eq 0 ]; then
  # Run all E2E tests
  bun run test:e2e > "$output_file" 2>&1 || exit_code=$?
else
  # Run specific spec file - use turbo -F and -- to pass spec through
  bun run turbo run test:e2e -F web -- "$1" > "$output_file" 2>&1 || exit_code=$?
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
