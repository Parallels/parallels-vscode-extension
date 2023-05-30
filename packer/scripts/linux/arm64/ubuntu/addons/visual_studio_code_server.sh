#!/bin/sh -eux

sudo cp /parallels-tools/files/visual_studio_code.service /etc/systemd/system/visual_studio_code.service
sudo systemctl daemon-reload
sudo systemctl enable visual_studio_code.service