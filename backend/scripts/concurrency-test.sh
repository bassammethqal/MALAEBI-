#!/usr/bin/env bash
# Integration test: two different players try to reserve the same 60-minute slot.
# Expected: exactly one HTTP 2xx and one HTTP 409 due to the PostgreSQL overlap constraint.
set -euo pipefail
: "${BASE_URL:?Set BASE_URL, e.g. https://api.example.com/api/v1}"
: "${TOKEN_A:?Set TOKEN_A}"
: "${TOKEN_B:?Set TOKEN_B}"
: "${FIELD_ID:?Set FIELD_ID}"
: "${STARTS_AT:?Set STARTS_AT as an ISO-8601 timestamp in the future}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
(
 curl -sS -o "$TMP/a.json" -w '%{http_code}' -X POST "$BASE_URL/bookings" \
  -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -H "Idempotency-Key: concurrency-test-a-$(date +%s%N)" \
  -d "{\"field_id\":\"$FIELD_ID\",\"starts_at\":\"$STARTS_AT\"}" > "$TMP/a.code"
) &
(
 curl -sS -o "$TMP/b.json" -w '%{http_code}' -X POST "$BASE_URL/bookings" \
  -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" \
  -H "Idempotency-Key: concurrency-test-b-$(date +%s%N)" \
  -d "{\"field_id\":\"$FIELD_ID\",\"starts_at\":\"$STARTS_AT\"}" > "$TMP/b.code"
) &
wait
A="$(cat "$TMP/a.code")"; B="$(cat "$TMP/b.code")"
echo "A=$A $(cat "$TMP/a.json")"
echo "B=$B $(cat "$TMP/b.json")"
if { [[ "$A" =~ ^2 ]] && [[ "$B" == 409 ]]; } || { [[ "$B" =~ ^2 ]] && [[ "$A" == 409 ]]; }; then
 echo "PASS: only one booking was created."
else
 echo "FAIL: expected one success and one conflict."
 exit 1
fi
