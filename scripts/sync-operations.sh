#!/bin/bash
# sync-operations.sh
# Pulls all Azure resource provider operations from the Azure REST API.
# Requires: az CLI installed and authenticated (az login)
#
# Output: data/raw/operations-raw.json
#
# Usage:
#   ./scripts/sync-operations.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/data/raw"
OUTPUT_FILE="$OUTPUT_DIR/operations-raw.json"

mkdir -p "$OUTPUT_DIR"

echo "=== Azure RBAC Explorer: Syncing Provider Operations ==="
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

echo "Pulling all provider operations..."
echo "This may take 60-120 seconds (there are 230+ resource providers)..."

az provider operation list \
    --output json \
    > "$OUTPUT_FILE"

# Count total operations across all providers
OP_COUNT=$(cat "$OUTPUT_FILE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
total = 0
for provider in data:
    for rt in provider.get('resourceTypes', []):
        total += len(rt.get('operations', []))
print(total)
" 2>/dev/null || echo "unknown")

PROVIDER_COUNT=$(cat "$OUTPUT_FILE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")

echo ""
echo "Done! Pulled $OP_COUNT operations across $PROVIDER_COUNT resource providers."
echo "Output: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Next step: Run 'node scripts/build-data.js' to process the data."
