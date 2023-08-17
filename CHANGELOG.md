# Change Log

All notable changes to the "parallels-desktop" extension will be documented in this file.

## [0.0.1] - 2023-05-13

* Initial release of the extension

## [0.0.2] - 2023-05-13

* Added documentation

## [0.0.3] - 2023-05-13

* Improved documentation
* Added pull request template for community

## [0.0.4] - 2023-05-15

* profile would be overwritten when the new version is out
* creating Vms would fail due to missing scripts
* the welcome screen was missing a button to create VMs
* some commands were being rendered in the command pallet and should not
* added the missing vagrant box refresh button
* fixed the aggressive auto-refresh for VMS

## [0.0.5] - 2023-05-16

* Fixed issue with os icon not displaying correctly in details
* Fixed issue with screenshot not displaying correctly in details
* Added progress of operation to all VMs commands
* Added the ability to drag multiple machines
* Added 'preview' icon to the extension manifest -Added badge to the extension manifest
* Added more OS icons
* Added black screen is machine screenshot is not available
* fixed missing group delete icon

## [0.0.6] - 2023-05-16

* Fixed an issue where we could not delete an empty group
* Fixed an issue with the confirmation dialog

## [0.0.7] - 2023-07-03

* Updated documentation

## [0.0.8] - 2023-07-12

* Added the ability to init a vagrant box and give a name to the VM

## [0.5.8] - 2023-08-09

* Fixed an issue where you were unable to resume suspended VMs in groups
* Fixed an issue where you were unable to create a MacVM
* Fixed an issue where you were unable to create Ubuntu Machines
* Added ability to create Windows Machines
* Upgraded Packer engine to use the packer-examples repo from Parallels
* Added the ability to Hide/Show Vms
* Added the ability to Hide/Show Groups
* Added the ability to Hide/Show All Vms or Groups
* Added the ability to rename a Group
* Added the ability to show the snapshot tree in a flat way, this is configured in settings
* Further improved the UI
* Further improvements in performance
  
## [0.5.9] - 2023-08-09

* Fixed an issue with the Telemetry service
* Renamed the Group telemetry
  
## [0.6.0] - 2023-08-10

* Fixed an issue where the VMs would not show up in the tree view
* Fixed an issue where the snapshots would generate a duplicate error

## [0.7.0] - 2023-08-14

* Fixed an issue where you could move folders inside themselves and that would delete them
* Fixed an issue where you where unable to create a folder with the same name even if it was a subfolder
* Fixed the automatic installation of Vagrant [#22](https://github.com/Parallels/parallels-vscode-extension/issues/22) and [#30](https://github.com/Parallels/parallels-vscode-extension/issues/30)
* Improved other dependencies installation
* Improved startup speed after first initialization by caching the settings in the profile file
* Added backup of the profile file
* Added the ability to set dynamic flags when creating Virtual Machines
* Added the ability to enable/disable the rosetta flag when creating Mac Virtual Machines
* Added the ability to enable/disable the rosetta flag in the tree
* Added visual queue when VM has rosetta enabled
* Added a fix that prevents MacVMs from being able to show the take snapshot as this would crash
* added other small bug fixes

## [0.7.1] - 2023-08-14

* Fixed an issue with the latest version of the extension

## [0.8.0] - 2023-08-15

* Added the ability to control docker from a virtual machine
* Fixed the issue with the discord server link
* Added the Helpful links section
* Added the new icons
* Added the ability to create a VM with the x86_64 architecture
* Fixed some extra bugs in the folders
* Added extra caching to the profile file
* Fixed other small issues

## [0.9.0] - 2023-08-16

* Added the ability to create container
* fixed some issues when creating a container
* Added the ability to check docker images in a VM
* Added some missing new icons
* Fixed the light theme icons and colors
* Added the new "Add VM" ux design
* Further stability improvement
  
## [1.0.0] - 2023-08-17

* Fixed a bug where you could press a button while the action was already underway
* Added the ability to copy the VM Ip if known to the clipboard
* Added the new readme
* Cleaned up the code for release.
* Added the ability to set the default to run machines in a headless mode
* Further small fixes