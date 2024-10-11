#!/bin/bash

CHANGELOG_FILE="CHANGELOG.md"
OUTPUT_FILE="release_notes.md"
OUTPUT_TO_FILE="FALSE"
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
  --CHANGELOG_FILE)
    CHANGELOG_FILE=$2
    shift
    shift
    ;;
  --file)
    OUTPUT_FILE shift
    shift
    ;;
  --output-to-file)
    OUTPUT_TO_FILE="TRUE"
    shift
    ;;
  *)
    echo "Invalid argument: $1" >&2
    exit 1
    ;;
  esac
done

function get_highest_version() {
  # Use grep to extract lines with version numbers, cut to get the version numbers, sort them and get the highest
  highest_version=$(grep -E '## \[[0-9]+\.[0-9]+\.[0-9]+\]' CHANGELOG.md | cut -d '[' -f 2 | cut -d ']' -f 1 | sort -Vr | head -n 1)
  echo $highest_version
}

function get_content_for_version() {
  # Check if a version was found
  if [ -z "$highest_version" ]; then
    echo "No version found in the changelog."
    exit 1
  fi

  # Extract the content for the highest version
  awk '
    /^## \[.*\]/ {
        if (found_version) {
            exit
        } else {
            found_version=1
            next
        }
    }
    found_version {
        print
    }
' "$CHANGELOG_FILE"
}

function generate_release_notes() {
  # Get the highest version
  highest_version=$(get_highest_version)

  # Get the content for the highest version
  content=$(get_content_for_version)

  # Write the content to the output file
  if [ "$OUTPUT_TO_FILE" == "TRUE" ]; then
    echo -e "# Release Notes for v$highest_version\n$content" >$OUTPUT_FILE
  else
    echo -e "# Release Notes for v$highest_version\n$content"
  fi
}

if [ "$MODE" == "GENERATE" ]; then
  generate_release_notes
elif [ "$MODE" == "HIGHEST_VERSION" ]; then
  get_highest_version
else
  echo "Invalid mode: $MODE" >&2
  exit 1
fi
