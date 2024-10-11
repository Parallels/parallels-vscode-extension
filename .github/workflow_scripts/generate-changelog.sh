#!/bin/bash

VERBOSE="FALSE"
CHANGELOG_FILE="CHANGELOG.md"
RELEASE_NOTES_FILE="release_notes.md"
OUTPUT_TO_FILE="FALSE"
VERBOSE="FALSE"
MODE="GENERATE"
while [[ $# -gt 0 ]]; do
  case $1 in
  -m)
    MODE=$2
    shift
    shift
    ;;
  --mode)
    MODE=$2
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
  --CHANGELOG_FILE)
    CHANGELOG_FILE=$2
    shift
    shift
    ;;
  --file)
    RELEASE_NOTES_FILE=$2
    shift
    shift
    ;;
  --output-to-file)
    OUTPUT_TO_FILE="TRUE"
    shift
    ;;
  --verbose)
    VERBOSE="TRUE"
    shift
    ;;
  *)
    echo "Invalid argument: $1" >&2
    exit 1
    ;;
  esac
done

function generate_release_notes() {
  #get when the last release was merged
  LAST_RELEASE_MERGED_AT=$(gh pr list --repo "$REPO_NAME" --base main --json mergedAt --state merged --search "label:release" | jq -r '.[0].mergedAt')
  CHANGELIST=$(gh pr list --repo "$REPO_NAME" --base main --state merged --json body --search "merged:>$LAST_RELEASE_MERGED_AT -label:release")

  temp_file=$(mktemp)

  CONTENT=$(echo "$CHANGELIST" | jq -r '.[].body')
  echo "$CONTENT" | while read -r line; do
    if [[ $line != -* ]]; then
      echo "- $line" >>"$temp_file"
    else
      echo "$line" >>"$temp_file"
    fi
  done

  content=$(awk '/# Description/{flag=1; next} /##/{flag=0} flag' "$temp_file")
  # Trim empty lines from the content
  content=$(echo "$content" | sed '/^[[:space:]]*$/d' | sed '/^-\s*$/d')

  if [ "$OUTPUT_TO_FILE" == "TRUE" ]; then
    # store the release notes in a variable so we can use it later
    if [ -f "$RELEASE_NOTES_FILE" ]; then
      rm "$RELEASE_NOTES_FILE"
    fi
    echo "# Release $NEW_RELEASE" >"$RELEASE_NOTES_FILE"
    echo "" >>"$RELEASE_NOTES_FILE"
    echo "$content" >>"$RELEASE_NOTES_FILE"
  else
    echo "$content"
  fi

  rm "$temp_file"
}

function insert_changelog_content() {
  local line_number="$1"
  local content="$2"
  local file="$3"

  local temp_file
  temp_file=$(mktemp)
  local content_file
  content_file=$(mktemp)

  echo "$content" >"$content_file"

  line_number=$((line_number + 2))

  awk -v lineno="$line_number" -v content_file="$content_file" '
    NR == lineno {
        while ((getline line < content_file) > 0) {
            print line
        }
        close(content_file)
    }
    { print }
    ' "$file" >"$temp_file"

  mv "$temp_file" "$file"
  rm "$content_file"
}

function append_changelog_content() {
  local start_line="$1"
  local end_line="$2"
  local content="$3"
  local file="$4"

  local temp_file
  temp_file=$(mktemp)
  local content_file
  content_file=$(mktemp)

  echo "$content" >"$content_file"
  end_line=$((end_line - 1))

  awk -v start="$start_line" -v end="$end_line" -v content_file="$content_file" '
    {
        print
        if (NR == end) {
            while ((getline line < content_file) > 0) {
                print line
            }
            close(content_file)
        }
    }
    ' "$file" >"$temp_file"

  mv "$temp_file" "$file"
  rm "$content_file"
}

function generate_changelog_entry() {
  TEMP_FILE=$(mktemp)
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Generating release notes for repository ${REPO_NAME}"
  fi
  generate_release_notes >>$TEMP_FILE
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Release notes generated successfully"
  fi
  CONTENT=$(cat "$TEMP_FILE")

  # Check if the version exists
  VERSION_LINE=$(grep -n "^## \[$NEW_RELEASE\]" "$CHANGELOG_FILE" | cut -d: -f1)
  if [ -z "$VERSION_LINE" ]; then
    # Version does not exist, create a new section
    if [ "$VERBOSE" == "TRUE" ]; then
      echo "Version $NEW_RELEASE does not exist, creating new section"
    fi

    # Find where to insert the new version (after the header)
    HEADER_END_LINE=$(grep -n -m1 "^## \[.*\]" "$CHANGELOG_FILE" | cut -d: -f1)
    if [ -z "$HEADER_END_LINE" ]; then
      # No existing versions, append at the end
      INSERT_LINE=$(wc -l <"$CHANGELOG_FILE")
      INSERT_LINE=$((INSERT_LINE + 1))
    else
      # Insert after the header (assumed to be the first two lines)
      INSERT_LINE=3
    fi

    TODAY=$(date '+%Y-%m-%d')

    NEW_VERSION_SECTION="## [$NEW_RELEASE] - $TODAY

$CONTENT
"

    insert_changelog_content "$INSERT_LINE" "$NEW_VERSION_SECTION" "$CHANGELOG_FILE"
  else
    # Version exists, append content to the version section
    if [ "$VERBOSE" == "TRUE" ]; then
      echo "Version $NEW_RELEASE exists, appending content"
    fi

    # Find where the version section ends
    NEXT_VERSION_LINE=$(awk -v ver_line="$VERSION_LINE" 'NR > ver_line && /^## \[.*\]/ {print NR; exit}' "$CHANGELOG_FILE")

    if [ -z "$NEXT_VERSION_LINE" ]; then
      # Version section goes to the end of the file
      END_LINE=$(wc -l <"$CHANGELOG_FILE")
    else
      END_LINE=$((NEXT_VERSION_LINE - 1))
    fi

    append_changelog_content "$VERSION_LINE" "$END_LINE" "$CONTENT" "$CHANGELOG_FILE"
  fi

  # Remove the temporary file
  rm "$TEMP_FILE"
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Changelog has been updated successfully."
  fi
}

if [ "$MODE" == "GENERATE" ]; then
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Generating changelog entry for repository ${REPO_NAME}"
  fi
  generate_changelog_entry
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Changelog entry generated successfully"
  fi
elif [ "$MODE" == "RELEASE" ]; then
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Generating release notes for repository ${REPO_NAME}"
  fi
  generate_release_notes
  if [ "$VERBOSE" == "TRUE" ]; then
    echo "Release notes generated successfully"
  fi
else
  echo "Invalid mode: $MODE" >&2
  exit 1
fi
