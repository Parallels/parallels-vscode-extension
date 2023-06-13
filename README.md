# Parallels Desktop for VS Code

[![Build](https://github.com/Parallels/parallels-vscode-extension/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Parallels/parallels-vscode-extension/actions/workflows/build.yml)  

This extension allows you to manage a wide range of operations for your Virtual appliances

> **Attention** This extension will only work on Apple Mac

## Features

### Manage Groups

* Create groups for easier management of your virtual machines
* Create group snapshots
* Start/stop group virtual machines
* Visual Cue for group state

![grouping](docs/feature_grouping.gif)

### Manage Virtual Machine states

* Start Machines
* Stop Machines
* Pause Machines
* Suspend Machines
* Show current state of Machines
* Take snapshot of a Machine

![machine_state](docs/machine_states.gif)

### Virtual Machine Details

* Show Virtual Machine details
* Change Machine Settings

![vm_details](docs/vm_details.png)

### Creating Virtual Machines

* Adding new custom Virtual Machines
* Use "Addons" to get pre installed applications
* Wide range of appliances and growing
* Open source for community expansion

![create_vm](docs/create_vm.gif)

## Requirements

You will need to be on Apple Mac and own a license of Parallels Desktop Pro or Business Edition, find more information [here](https://www.parallels.com/uk/products/desktop/pro/)

## Extension Settings

This extension contributes the following settings:

* `parallels-desktop.output_path`: Output path for the packer machines.
* `parallels-desktop.path`: Path for your Parallels Desktop installation.
* `parallels-desktop.downloadFolder`: Download folder for any Iso/IPSW that requires downloading.
* `parallels-desktop.vagrant.path`: Path for the vagrant tool.
* `parallels-desktop.hashicorp.packer.path`: Path for the packer tool.

> Tip: The extension will use default values that will work on most cases and it will try to install all of the dependencies

## Known Issues

None at the moment

## Release Notes

### 0.0.1

* Initial release of the extension

### 0.0.2

* Added documentation

---
