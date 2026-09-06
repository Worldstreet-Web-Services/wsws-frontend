#!/usr/bin/env bash
set -euo pipefail

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure standard user paths for pnpm/node managers (nvm, mise, homebrew)
export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$HOME/.nvm/versions/node/v22.23.0/lib/node_modules/corepack/shims:$HOME/.nvm/versions/node/v22.0.0/bin:$HOME/.local/share/mise/installs/node/20.20.2/lib/node_modules/corepack/shims:$HOME/.local/share/mise/shims:$HOME/.local/share/mise/installs/node/20.20.2/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo -e "${BLUE}=== Starting Frontend Governance Preflight Checks ===${NC}"

echo -e "\n${BLUE}[1/5] Prettier Format Check...${NC}"
pnpm format:check

echo -e "\n${BLUE}[2/5] ESLint Quality Check...${NC}"
pnpm lint

echo -e "\n${BLUE}[3/5] TypeScript Type Check...${NC}"
pnpm typecheck

echo -e "\n${BLUE}[4/5] Vitest Suite...${NC}"
pnpm test

echo -e "\n${BLUE}[5/5] Next.js Production Build...${NC}"
pnpm build

echo -e "\n${GREEN}✓ All preflight gates passed successfully!${NC}"
