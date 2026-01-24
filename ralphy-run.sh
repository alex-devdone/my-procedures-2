#!/usr/bin/env bash
set -euo pipefail

log_file=".ralphy/ralphy-run.log"
total_runs=3
total_steps=2

log() {
  echo "$1" | tee -a "$log_file"
}

run_step() {
  local label="$1"
  shift
  local start end duration status tmp
  local stop_phrase="PRD complete!"
  tmp="$(mktemp)"
  start="$(date +%s)"

  log "${label}: start $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  set +e
  "$@" 2>&1 | tee "$tmp"
  status=${PIPESTATUS[0]}
  set -e

  end="$(date +%s)"
  duration=$((end - start))
  log "${label}: duration ${duration}s"
  log "${label}: last 10 lines of output"
  tail -n 10 "$tmp" >>"$log_file"
  log "${label}: exit status ${status}"

  if [ "$status" -ne 0 ]; then
    rm -f "$tmp"
    exit "$status"
  fi

  if grep -q "$stop_phrase" "$tmp"; then
    rm -f "$tmp"
    log "${label}: stop phrase detected, ending run loop"
    return 2
  fi

  rm -f "$tmp"
}

start_all="$(date +%s)"
log "Run started $(date -u +%Y-%m-%dT%H:%M:%SZ)"

for run in $(seq 1 "$total_runs"); do
  run_step "Run ${run}/${total_runs} Step 1/${total_steps} (with --codex)" \
    ./ralphy.sh --prd .ralphy/PRD.md --codex --create-pr || rc=$?
  if [ "${rc:-0}" -eq 2 ]; then
    break
  fi
  unset rc

  run_step "Run ${run}/${total_runs} Step 2/${total_steps} (with --sonnet)" \
    ./ralphy.sh --prd .ralphy/PRD.md --sonnet --create-pr || rc=$?
  if [ "${rc:-0}" -eq 2 ]; then
    break
  fi
  unset rc
done

end_all="$(date +%s)"
total_duration=$((end_all - start_all))
log "Run finished $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Total duration ${total_duration}s"
