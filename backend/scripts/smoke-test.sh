#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000/api/v1}"
echo "1) Health"
curl -fsS "$BASE/health"
echo
echo "2) Public venues"
curl -fsS "$BASE/venues"
echo
echo "For authenticated checks, obtain an OTP in development mode, then run:"
echo "TOKEN='<access token>' curl -H 'Authorization: Bearer $TOKEN' '$BASE/bookings/mine'"
