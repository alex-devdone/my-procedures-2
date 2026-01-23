---
name: test-runner
description: Quick test and lint runner with output truncation to conserve context window. Runs linting (Biome), type checking (TypeScript), unit tests (vitest), and E2E tests (Playwright) with output automatically truncated to last 30 lines. Use when you need to run tests, check code quality, or validate changes without overwhelming context.
---

# test-runner

Quick test and lint runner with output truncation to conserve context window.

## Usage

Invoke with `/test-runner` followed by optional arguments:

```bash
/test-runner lint                    # Run Biome linting/formatting
/test-runner types                   # Run TypeScript type checking
/test-runner unit                    # Run all unit tests
/test-runner unit <pattern>          # Run unit tests matching pattern
/test-runner e2e                     # Run all E2E tests
/test-runner e2e <spec>              # Run specific E2E spec file
/test-runner prepush                 # Run lint + types (pre-push checks)
```

## Examples

```bash
# Quick lint check
/test-runner lint

# Type check the entire monorepo
/test-runner types

# Run all unit tests
/test-runner unit

# Run specific unit tests
/test-runner unit todo.api.test

# Run all E2E tests
/test-runner e2e

# Run specific E2E test
/test-runner e2e todo.spec.ts

# Pre-push validation
/test-runner prepush
```

## Output

All commands truncate output to the last 30 lines to conserve context. If output exceeds 30 lines, you'll see a truncation notice. Exit codes are preserved for CI/CD compatibility.

## When to Use

- Quick validation during development
- Before creating commits
- After making changes to verify nothing broke
- When you need test results but want to minimize context usage

## Implementation

**When this skill is invoked**, parse the arguments and execute the corresponding script:

- `/test-runner lint` → Run `bash .claude/skills/test-runner/scripts/run-lint.sh`
- `/test-runner types` → Run `bash .claude/skills/test-runner/scripts/run-types.sh`
- `/test-runner unit [pattern]` → Run `bash .claude/skills/test-runner/scripts/run-unit-tests.sh [pattern]`
- `/test-runner e2e [spec]` → Run `bash .claude/skills/test-runner/scripts/run-e2e-tests.sh [spec]`
- `/test-runner prepush` → Run `bash .claude/skills/test-runner/scripts/run-prepush-checks.sh`

This skill uses shell scripts located in `.claude/skills/test-runner/scripts/` that automatically navigate to the git root and handle output truncation.

**Important**: Scripts must be run from within the git repository. They use `git rev-parse --show-toplevel` to find the project root automatically.

### Direct Script Usage

```bash
# From anywhere in the project
bash .claude/skills/test-runner/scripts/run-lint.sh
bash .claude/skills/test-runner/scripts/run-types.sh
bash .claude/skills/test-runner/scripts/run-unit-tests.sh [pattern]
bash .claude/skills/test-runner/scripts/run-e2e-tests.sh [spec]
bash .claude/skills/test-runner/scripts/run-prepush-checks.sh
```

### How Scripts Work

1. Navigate to git root using `git rev-parse --show-toplevel`
2. Run tests/checks from root using turbo
3. Capture full output to temporary file
4. Display last 30 lines with truncation notice if needed
5. Preserve exit codes for CI/CD compatibility
