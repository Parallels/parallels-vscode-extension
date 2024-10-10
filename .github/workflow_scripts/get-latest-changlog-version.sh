#!/bin/bash

# Use grep to extract lines with version numbers, cut to get the version numbers, sort them and get the highest
highest_version=$(grep -E '## \[[0-9]+\.[0-9]+\.[0-9]+\]' CHANGELOG.md | cut -d '[' -f 2 | cut -d ']' -f 1 | sort -Vr | head -n 1)

echo $highest_version