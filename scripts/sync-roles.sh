#!/bin/bash
# sync-roles.sh
# Pulls all Azure built-in role definitions from the Azure REST API.
# Requires: az CLI installed and authenticated (az login)
#
# Output: data/raw/roles-raw.json
#
# Usage:
#   ./scripts/sync-roles.sh
#   ./scripts/sync-roles.sh --subscription <sub-id>  # optional: specify subscription

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/data/raw"
OUTPUT_FILE="$OUTPUT_DIR/roles-raw.json"

mkdir -p "$OUTPUT_DIR"

echo "=== Azure RBAC Explorer: Syncing Built-in Role Definitions ==="
echo ""

# Check az CLI is available
if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI (az) is not installed."
    echo "Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check authentication
if ! az account show &> /dev/null 2>&1; then
    echo "ERROR: Not authenticated. Run 'az login' first."
    exit 1
fi

ACCOUNT=$(az account show --query '{name:name, id:id}' -o tsv)
echo "Authenticated. Account: $ACCOUNT"
echo ""

# Pull all built-in role definitions
# --custom-role-only false ensures we get built-in roles
# We filter to built-in only (roleType == "BuiltInRole")
echo "Pulling built-in role definitions..."
echo "This may take 30-60 seconds..."

az role definition list \
    --query "[?roleType=='BuiltInRole']" \
    --output json \
    > "$OUTPUT_FILE"

ROLE_COUNT=$(cat "$OUTPUT_FILE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")

echo ""
echo "Done! Pulled $ROLE_COUNT built-in role definitions."
echo "Output: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Next step: Run 'node scripts/build-data.js' to process the data."
