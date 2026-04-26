#!/bin/bash
# update-rule-versions.sh - Manual rule version management script
# Usage: ./scripts/update-rule-versions.sh <file-path> <change-type> [task-id]
# Example: ./scripts/update-rule-versions.sh .kiro/steering/typescript-standards.md minor VERSION-002

set -e

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <file-path> <change-type> [task-id]"
    echo "Change types: patch, minor, major"
    echo "Example: $0 .kiro/steering/typescript-standards.md minor VERSION-002"
    exit 1
fi

FILE_PATH="$1"
CHANGE_TYPE="$2"
TASK_ID="${3:-}"

# Validate file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File '$FILE_PATH' not found"
    exit 1
fi

# Validate change type
if [[ ! "$CHANGE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Change type must be 'patch', 'minor', or 'major'"
    exit 1
fi

# Get current CST date
CST_DATE=$(curl -s "http://worldtimeapi.org/api/timezone/America/Chicago" 2>/dev/null | jq -r '.datetime' 2>/dev/null | cut -d'T' -f1 || date +%Y-%m-%d)

# Extract current version
CURRENT_VERSION=$(grep "version:" "$FILE_PATH" | head -1 | sed 's/.*version: "\(.*\)".*/\1/')

if [ -z "$CURRENT_VERSION" ]; then
    echo "Error: No version found in $FILE_PATH"
    exit 1
fi

# Calculate new version
case $CHANGE_TYPE in
    "major")
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print ($1+1) ".0.0"}')
        ;;
    "minor")
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print $1 "." ($2+1) ".0"}')
        ;;
    "patch")
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print $1 "." $2 "." ($3+1)}')
        ;;
esac

echo "Updating $FILE_PATH: $CURRENT_VERSION -> $NEW_VERSION"

# Update version
sed -i.bak "s/version: \"$CURRENT_VERSION\"/version: \"$NEW_VERSION\"/" "$FILE_PATH"

# Update lastUpdated
sed -i.bak "s/lastUpdated: \".*\"/lastUpdated: \"$CST_DATE\"/" "$FILE_PATH"

# Update lastUpdatedBy
sed -i.bak "s/lastUpdatedBy: \".*\"/lastUpdatedBy: \"AI Assistant\"/" "$FILE_PATH"

# Update taskId if provided
if [ -n "$TASK_ID" ]; then
    sed -i.bak "s/taskId: \".*\"/taskId: \"$TASK_ID\"/" "$FILE_PATH"
fi

# Remove backup file
rm -f "$FILE_PATH.bak"

echo "✅ Version update complete!"
echo "📝 Commit with: git add $FILE_PATH && git commit -m 'chore: update $(basename $FILE_PATH .md) to v$NEW_VERSION'"
