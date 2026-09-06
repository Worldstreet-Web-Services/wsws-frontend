#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

export PATH="$HOME/.nvm/versions/node/v22.23.0/bin:$HOME/.nvm/versions/node/v22.23.0/lib/node_modules/corepack/shims:$HOME/.nvm/versions/node/v22.0.0/bin:$HOME/.local/share/mise/installs/node/20.20.2/lib/node_modules/corepack/shims:$HOME/.local/share/mise/shims:$HOME/.local/share/mise/installs/node/20.20.2/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo -e "${BLUE}=== Checking Release Notes Governance Gate ===${NC}"

# Determine base branch for comparison (default origin/main or HEAD~1)
TARGET_BRANCH="${TARGET_BRANCH:-origin/main}"

if git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
    DIFF_BASE="$TARGET_BRANCH"
else
    DIFF_BASE="HEAD~1"
fi

# Check if application source code has changed
CHANGED_APP_FILES=$(git diff --name-only "$DIFF_BASE"...HEAD 2>/dev/null | grep -E '^(app|features|components|lib)/' || true)

if [ -z "$CHANGED_APP_FILES" ]; then
    echo -e "${GREEN}✓ No application code changes detected. Release notes gate passed.${NC}"
    exit 0
fi

# Check for release notes in docs/release-notes/
RELEASE_NOTES=$(find docs/release-notes -type f -name "*.md" ! -name ".gitkeep" 2>/dev/null || true)

if [ -z "$RELEASE_NOTES" ]; then
    echo -e "${YELLOW}Warning: Application code changes detected, but no release note found in docs/release-notes/${NC}"
    echo -e "${YELLOW}Application files changed:${NC}"
    echo "$CHANGED_APP_FILES" | sed 's/^/  - /'
    echo -e "\n${YELLOW}Please add a release note markdown file under docs/release-notes/<date>-<feature>.md${NC}"
    # In strict CI environment, exit 1 if SKIP_RELEASE_NOTE_CHECK is not set
    if [ "${STRICT_RELEASE_NOTES:-false}" = "true" ]; then
        echo -e "${RED}❌ Release notes check failed in strict mode.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Release note present in docs/release-notes/. Gate passed.${NC}"
fi
