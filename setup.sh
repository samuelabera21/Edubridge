#!/usr/bin/env bash
# ============================================================
# EduBridge Dev Setup Script
# Run once after cloning: bash setup.sh
# ============================================================

set -e

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo ""
echo "=============================================="
echo "  EduBridge — Dev Environment Setup"
echo "=============================================="
echo ""

# --- Step 1: Create .env from .env.example if missing ---
if [ -f "$ENV_FILE" ]; then
  echo "✅  .env already exists — skipping creation."
else
  echo "📋  Creating .env from .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # --- Generate a secure random POSTGRES_PASSWORD ---
  if command -v openssl &> /dev/null; then
    PG_PASS=$(openssl rand -hex 16)
  else
    PG_PASS="edubridge_$(date +%s)_dev"
  fi

  # --- Generate a secure random BETTER_AUTH_SECRET ---
  if command -v openssl &> /dev/null; then
    AUTH_SECRET=$(openssl rand -hex 32)
  else
    AUTH_SECRET="edubridge-auth-secret-$(date +%s)-local-dev"
  fi

  # --- Set DEFAULT_INITIAL_PASSWORD ---
  DEFAULT_PASS="Admin@1234"

  # --- Write values into .env (cross-platform sed) ---
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed requires empty string after -i
    sed -i '' "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" "$ENV_FILE"
    sed -i '' "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${AUTH_SECRET}|" "$ENV_FILE"
    sed -i '' "s|^DEFAULT_INITIAL_PASSWORD=.*|DEFAULT_INITIAL_PASSWORD=${DEFAULT_PASS}|" "$ENV_FILE"
  else
    # Linux / Git Bash on Windows
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" "$ENV_FILE"
    sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${AUTH_SECRET}|" "$ENV_FILE"
    sed -i "s|^DEFAULT_INITIAL_PASSWORD=.*|DEFAULT_INITIAL_PASSWORD=${DEFAULT_PASS}|" "$ENV_FILE"
  fi

  echo "✅  .env created with auto-generated secrets."
  echo ""
  echo "  POSTGRES_PASSWORD  = ${PG_PASS}"
  echo "  BETTER_AUTH_SECRET = (hidden — see .env)"
  echo "  DEFAULT_INITIAL_PASSWORD = ${DEFAULT_PASS}"
fi

echo ""

# --- Step 2: Sync backend/.env with generated values ---
BACKEND_ENV="backend/.env"
if [ -f "$ENV_FILE" ]; then
  PG_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d '=' -f2)
  PG_PASS_FINAL=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d '=' -f2)
  PG_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d '=' -f2)
  DB_PORT=$(grep "^DB_PORT=" "$ENV_FILE" | cut -d '=' -f2)
  AUTH_SEC=$(grep "^BETTER_AUTH_SECRET=" "$ENV_FILE" | cut -d '=' -f2)

  cat > "$BACKEND_ENV" <<EOF
DATABASE_URL="postgresql://${PG_USER}:${PG_PASS_FINAL}@localhost:${DB_PORT}/${PG_DB}"
BETTER_AUTH_SECRET="${AUTH_SEC}"
BETTER_AUTH_URL="http://localhost:5000"
POSTGRES_USER=${PG_USER}
POSTGRES_PASSWORD=${PG_PASS_FINAL}
POSTGRES_DB=${PG_DB}
DEFAULT_INITIAL_PASSWORD=${DEFAULT_PASS}
ADMIN_PASSWORD=${DEFAULT_PASS}
EOF
  echo "✅  backend/.env synced with database credentials."
fi

echo ""
echo "=============================================="
echo "  Setup complete! Now run:"
echo "    docker compose up"
echo ""
echo "  Then log in at: http://localhost:3001"
echo "  Email    : admin@edubridge.local"
echo "  Password : Admin@1234"
echo "=============================================="
echo ""
