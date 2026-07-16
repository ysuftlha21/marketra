#!/usr/bin/env bash
# Creates E2E test users in Supabase for isolated Playwright projects.
# Each project (desktop, mobile, signout) gets its own Supabase user/session.
# Usage: SUPABASE_SERVICE_ROLE_KEY=key ./scripts/create-e2e-users.sh
# Or the script reads from .env.local

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load from .env.local if available
ENV_FILE="$PROJECT_DIR/.env.local"
if [ -f "$ENV_FILE" ]; then
  set -a
  source <(grep -E '^(SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL)=' "$ENV_FILE" || true)
  set +a
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_KEY" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  echo "Either export them or add to .env.local"
  exit 1
fi

AUTH_API="$SUPABASE_URL/auth/v1/admin/users"

create_user() {
  local email="$1"
  local password="$2"
  echo "Creating user: $email"
  curl -s -X POST "$AUTH_API" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"email_confirm\": true
    }" | tee /dev/stderr | python3 -c "import sys,json; print('  User ID:', json.load(sys.stdin).get('id','FAILED'))" 2>/dev/null || echo "  (may already exist)"
}

echo "=== Creating E2E test users ==="
create_user "e2e-test-mobile@example.com" "E2eTestPass123!"
create_user "e2e-test-signout@example.com" "E2eTestPass123!"
echo "=== Done ==="
