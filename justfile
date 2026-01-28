APP_PORT := "4757"

PRD_FILE := ".ralphy/PRD.md"

default:
	@just --list

title:
	@echo "My procedures"

description:
	@echo "Full-stack TypeScript monorepo with TanStack Start, tRPC, Better-Auth, and MongoDB"

port:
	@echo "{{APP_PORT}}"

status:
	@echo "═══════════════════════════════════════"
	@echo "Title: $(just title)"
	@echo "Description: $(just description)"
	@echo "Port: $(just port)"
	@echo "Run Status: $(just run-status)"
	@echo "Vibe Status: $(just vibe-status)"
	@echo "Failing Status: $(just failing-status)"
	@echo "═══════════════════════════════════════"

status-json:
	#!/usr/bin/env bash
	title=$(just title)
	description=$(just description)
	port=$(just port)
	run_status=$(just run-status)
	vibe_status=$(just vibe-status)
	failing_status=$(just failing-status)
	timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	jq -n \
		--arg title "$title" \
		--arg description "$description" \
		--argjson port "$port" \
		--arg run_status "$run_status" \
		--arg vibe_status "$vibe_status" \
		--arg failing_status "$failing_status" \
		--arg timestamp "$timestamp" \
		'{title: $title, description: $description, port: $port, run_status: $run_status, vibe_status: $vibe_status, failing_status: $failing_status, timestamp: $timestamp}'

run-status:
	@if lsof -i :{{APP_PORT}} -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "running"; \
	else \
		echo "stopped"; \
	fi

vibe-status:
	#!/usr/bin/env bash
	PRD_FILE="{{PRD_FILE}}"

	if [ -f "$PRD_FILE" ]; then
		# Count completed tasks: - [x]
		completed=$(grep -ci '^\- \[x\]' "$PRD_FILE" 2>/dev/null) || completed=0
		# Count remaining tasks: - [ ]
		remaining=$(grep -c '^\- \[ \]' "$PRD_FILE" 2>/dev/null) || remaining=0
		# Total = completed + remaining
		total=$((completed + remaining))

		if [ "$total" -gt 0 ]; then
			echo "$completed/$total"
		else
			echo "0/0"
		fi
	else
		echo "no PRD file"
	fi

failing-status:
	#!/usr/bin/env bash
	PRD_FILE="{{PRD_FILE}}"

	if [ -f "$PRD_FILE" ]; then
		if grep -q "^- \[✗\]" "$PRD_FILE" 2>/dev/null; then
			echo "failing"
		else
			echo "healthy"
		fi
	else
		echo "unknown"
	fi


run: stop
	#!/usr/bin/env bash
	set -euo pipefail
	sleep 1
	nohup bun run prod > .ralphy/prod.log 2>&1 &

dev: stop
	bun run dev

stop:
	#!/usr/bin/env bash
	if lsof -i :{{APP_PORT}} -sTCP:LISTEN >/dev/null 2>&1; then
		kill $(lsof -t -i :{{APP_PORT}}) 2>/dev/null || true
		echo "Server stopped"
	else
		echo "Server not running"
	fi

# Development Commands

vibe:
	#!/usr/bin/env bash
	source ~/.bashrc
	tmuxr ./ralphy-run.sh

vibe2:
	#!/usr/bin/env bash
	source ~/.bashrc
	cd /Users/klik1301/work/app-factory
	bash ralphy.sh --prd {{PRD_FILE}} --sonnet --create-pr

lint:
	bun run check 2>&1 | tail -n 30

lint-staged:
	bun run lint-staged 2>&1 | tail -n 30

prepush:
	bun run prepush 2>&1 | tail -n 30
