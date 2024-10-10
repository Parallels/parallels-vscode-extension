#!/bin/bash

while [[ $# -gt 0 ]]; do
  case $1 in
  -r)
    REPO_NAME=$2
    shift
    shift
    ;;
  --repo)
    REPO_NAME=$2
    shift
    shift
    ;;
  -v)
    NEW_RELEASE=$2
    shift
    shift
    ;;
  --version)
    NEW_RELEASE=$2
    shift
    shift
    ;;
  *)
    echo "Invalid argument: $1" >&2
    exit 1
    ;;
  esac
done

echo "Generating release notes for repository ${REPO_NAME}"

#get when the last release was merged
LAST_RELEASE_MERGED_AT=$(gh pr list --repo "$REPO_NAME" --base main --json mergedAt --state merged --search "label:release" | jq -r '.[0].mergedAt')
CHANGELIST=$(gh pr list --repo "$REPO_NAME" --base main --state merged --json body --search "merged:>$LAST_RELEASE_MERGED_AT -label:release")

# store the release notes in a variable so we can use it later
if [ -f releasenotes.md ]; then
  rm releasenotes.md
fi

CONTENT=$(echo "$CHANGELIST" | jq -r '.[].body')
echo "$CONTENT" | while read -r line; do
  echo "$line" >>releasenotes.md
done

echo "Release $NEW_RELEASE" >>releasenotes.md
content=$(sed -n '/# Description/,/##/p' releasenotes.md | sed '$d' | sed '1d')
# Trim empty lines from the content
content=$(echo "$content" | sed '/^$/d')
echo "$content"
echo " "
