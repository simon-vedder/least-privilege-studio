#!/bin/bash
# sync-entra.sh
# Pulls Microsoft Entra ID (directory) role definitions and the
# custom-role-assignable resource actions from Microsoft Graph.
#
# Requires: az CLI installed and authenticated (az login), and the
# signed-in identity (user or SP) needs directory read on Graph, e.g.
#   RoleManagement.Read.Directory  (or Directory.Read.All)
#
# Output:
#   data/raw/entra-roles-raw.json           (built-in directory roles)
#   data/raw/entra-resourceactions-raw.json (pickable custom-role actions)
#
# Usage:
#   ./scripts/sync-entra.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/data/raw"
ROLES_FILE="$OUTPUT_DIR/entra-roles-raw.json"
ACTIONS_FILE="$OUTPUT_DIR/entra-resourceactions-raw.json"

mkdir -p "$OUTPUT_DIR"

echo "=== Least Privilege Studio: Syncing Entra ID directory roles ==="
echo ""

if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI (az) is not installed."
    echo "Install: https://learn.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

if ! az account show &> /dev/null 2>&1; then
    echo "ERROR: Not authenticated. Run 'az login' first."
    exit 1
fi

# Follow @odata.nextLink and accumulate all pages into a single JSON array file.
# $1 = starting Graph URL, $2 = output file
pull_paged() {
    local url="$1" out="$2" acc page
    acc="$(mktemp)"
    echo "[]" > "$acc"
    page=0
    while [ -n "$url" ] && [ "$url" != "null" ]; do
        page=$((page + 1))
        echo "  page $page ..."
        local pagefile
        pagefile="$(mktemp)"
        az rest --method get --url "$url" > "$pagefile" 2>/dev/null
        # Merge this page's value[] into the accumulator; emit the nextLink on stdout
        url="$(python3 - "$acc" "$pagefile" <<'PY'
import sys, json
acc_path, page_path = sys.argv[1], sys.argv[2]
with open(page_path) as f:
    resp = json.load(f)
with open(acc_path) as f:
    acc = json.load(f)
acc.extend(resp.get("value", []))
with open(acc_path, "w") as f:
    json.dump(acc, f)
print(resp.get("@odata.nextLink") or "")
PY
)"
        rm -f "$pagefile"
    done
    mv "$acc" "$out"
}

echo "Pulling directory role definitions (built-in)..."
pull_paged "https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions" "$ROLES_FILE"
ROLE_COUNT=$(python3 -c "import json; print(len(json.load(open('$ROLES_FILE'))))" 2>/dev/null || echo "?")
echo "  -> $ROLE_COUNT roles"

echo "Pulling custom-role-assignable resource actions (microsoft.directory)..."
pull_paged "https://graph.microsoft.com/v1.0/roleManagement/directory/resourceNamespaces/microsoft.directory/resourceActions" "$ACTIONS_FILE"
ACTION_COUNT=$(python3 -c "import json; print(len(json.load(open('$ACTIONS_FILE'))))" 2>/dev/null || echo "?")
echo "  -> $ACTION_COUNT resource actions"

echo ""
echo "Done."
echo "  $ROLES_FILE"
echo "  $ACTIONS_FILE"
echo ""
echo "Next step: node scripts/build-entra.js"
