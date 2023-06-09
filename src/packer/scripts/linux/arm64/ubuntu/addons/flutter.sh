#!/bin/sh -eux

# Make directory
mkdir ~/development
cd ~/development

# Install dependecies
sudo apt install -y curl jq xz-utils git

# Download latest stable release
curl -s https://storage.googleapis.com/flutter_infra_release/releases/releases_linux.json | jq -r 'first(.releases[] | select(.channel | contains("stable"))).archive' | xargs -I % curl -O https://storage.googleapis.com/flutter_infra_release/releases/%

# Extract the downloaded archive
tar xf flutter_linux_*.tar.xz

# Remove the downloaded archive
rm flutter_linux_*.tar.xz

# Add Flutter to PATH in your .bashrc or .zshrc
echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >>~/.bashrc

# Apply the changes immediately
source ~/.bashrc
