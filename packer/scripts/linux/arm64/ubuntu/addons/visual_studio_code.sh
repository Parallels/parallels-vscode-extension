#!/bin/sh -eux

sudo DEBIAN_FRONTEND=noninteractive apt-get install -y wget gpg
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
rm -f packages.microsoft.gpg
sudo DEBIAN_FRONTEND=noninteractive apt install -y apt-transport-https
sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt install -y code
sudo DEBIAN_FRONTEND=noninteractive apt autoremove -y
