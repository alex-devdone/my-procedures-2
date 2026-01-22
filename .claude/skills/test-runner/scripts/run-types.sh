#!/usr/bin/env bash
# Run TypeScript type checking with output truncated to last 30 lines

set -euo pipefail

# Navigate to git root
cd "$(git rev-parse --show-toplevel)"

# Capture output and exit code
output_file=$(mktemp)
exit_code=0
bun run check-types > "$output_file" 2>&1 || exit_code=$?

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
