#!/bin/bash

if [ -z "$1" ]; then
  echo "Please provide an operation [enable|disable] as an argument"
  exit 1
fi

if [ -z "$2" ]; then
  FILENAME="/etc/apt/sources.list"
fi

if [ ! -f "$FILENAME" ]; then
  echo "File not found: $FILENAME"
  exit 1
fi

cp "$FILENAME" "${2}_$(date +%Y%m%d%H%M%S)"

if [ "$1" == "enable" ]; then
  while read -r line || [[ -n "$line" ]]; do
    if [[ $line == deb* && $line != *"deb-src"* && $line != *"[arch=arm64]"* && $line == *"ports.ubuntu"* ]]; then
      line="deb [arch=arm64] ${line#deb}"
      echo "$line" >>"$FILENAME.build"
      line1="${line/ports./archive.}"
      line1="${line1/-ports/}"
      line1="${line1/arm64/amd64}"
      echo "$line1" >>"$FILENAME.build"
    # Check if the line starts with "deb" and does not contain "[arch=arm64]"
    elif [[ $line == "deb-src"* && $line != *"[arch=arm64]"* && $line == *"ports.ubuntu"* ]]; then
      # Add "[arch=amd64]" just in front of the word "deb"
      line="deb-src [arch=arm64] ${line#deb-src}"
      echo "$line" >>"$FILENAME.build"
      line1="${line/ports./archive.}"
      line1="${line1/-ports/}"
      line1="${line1/arm64/amd64}"
      echo "$line1" >>"$FILENAME.build"
    else
      # Otherwise, leave the line unmodified
      line="$line"
      echo "$line" >>"$FILENAME.build"
    fi
  done <"$FILENAME"

  sudo dpkg --add-architecture amd64
  sudo apt update
  echo "AMD64 architecture enabled"
else
  while read -r line || [[ -n "$line" ]]; do
    if [[ $line == deb* && $line != *"deb-src"* && $line == *"[arch=amd64]"* && $line == *"archive.ubuntu"* ]]; then
      echo "removing"
    elif [[ $line == "deb-src"* && $line == *"[arch=amd64]"* && $line == *"archive.ubuntu"* ]]; then
      echo "removing"
    else
      line="$line"
      echo "$line" >>"$FILENAME.build"
    fi
  done <"$FILENAME"
  echo "AMD64 architecture disabled"
fi

if [ -f "$FILENAME" ]; then
  rm "$FILENAME"
  cp "$FILENAME.build" "$FILENAME"
  rm "$FILENAME.build"
fi
