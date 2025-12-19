# Change Log

All notable changes to the "parallels-desktop" extension will be documented in this file.

## [1.5.8] - 2025-12-19



## [1.5.7] - 2025-12-19

- fixed privacy url

## [1.5.6] - 2025-11-19



## [1.5.5] - 2025-11-19

- Updated Kali Linux to the latest version

## [1.5.4] - 2025-08-26

- Eliminated the sunset AI package prompt from initialization.
- Removed configuration options and related logic for the sunset AI package.
- Deleted all commands and services associated with the Parallels Catalog, including refresh, pull manifest, and onboarding commands.
- Cleaned up the ParallelsCatalogProvider and its associated methods.
- Updated configuration service to remove references to the sunset AI package.

## [1.5.3] - 2025-07-22

- Added the new message for the sunset of the PD AI package

## [1.5.2] - 2025-04-30

- Fixed an issue where the tree was getting stuck on refresh
- Fixed an issue where the extension would fail to start if devops was updated
- Fixed an issue when displaying error messages
- Fixed an issue where the tree was getting stuck on refresh
- Fixed an issue where the extension would fail to start if devops was updated
- Fixed an issue when displaying error messages

## [1.5.1] - 2025-02-13

- Fixed an issue where the right click would show options not available for each machine, fixes #158 
- Fixed an issue with detecting new devops service versions
- Added the ability to notify discord users about new versions

## [1.5.0] - 2025-01-14

- Added new icon designs
- Added the ability to control cached items from the extension
- Added the ability to check the reverse proxy configuration
- Added the ability to check more information about the remote hosts
- Added the ability to get the logs for the remote hosts
- Further stability and bug fixes
- Added the ability to see and control the cache items in either the hosts or the orchestrator
- Added the ability to remove cache items from the system
- minor fixes to the tree when removing/adding items
- Minor fixes to the diff and saving of profiles

## [1.4.3] - 2024-11-06

- Fixed an issue where if a remote host was down the auto-refresh would not work as intended

## [1.4.2] - 2024-10-18

- Added the support for the latest macOS15 to the list of VMs

## [1.4.1] - 2024-10-11

- Added makefile for ease of access to functionalities
- Added automation for the changelog file
- Improved the upload of the artifacts
- Added a script to generate changelog
- Added a script to generate release noted
- Initial updated for the new automation pipeline
- Fixed an issue with the drag and drop for the vms target

## [1.4.0] - 2024-10-09

- Fixed the issue where vscode would crash if created two remote hosts from the same name
- Fixed an issue where in some cases the extension would not activate
- Updated Ubuntu images for the latest ones
- Other minor changes

## [1.2.20] - 2024-09-06

- Fixed an issue with the copyIpToClipboard
- Fixed an issue where the license would not show properly for some users #110
- Fixed an issue where the devops service was not being recognized correctly
- Fixed an issue where the hide/show on the tree was not triggering properly
- Removed the ability to download the same catalog twice
- further minor fixes and improvements

## [1.0.12] - 2023-10-15

- Added MacOS Monterey to the list of VMs Distros you can create
- Added MacOS Sonoma RC to the list of VMs Distros you can create

## [1.0.11] - 2023-09-14

- Added Redhat and Parrot OS to the automated images
- Added the ability to create a Vagrant box from Vagrant Cloud
- Fixed an issue in if a Packer script didn't had a addons folder it would not open the page

## [1.0.10] - 2023-09-04

- Fixed an issue where if a log message was in a bad state it would hang the tree refresh
- Fixed an issue where we could not list the docker containers even if the machine had docker installed

## [1.0.9] - 2023-09-01

- Added an automatic installation for the Vagrant Parallels Desktop plugin
- Added Kali Linux to the list of VMs Distros you can create
- Improved the Bug Report template and the new feature request template

## [1.0.8] - 2023-08-29

- Fixed some issues where some commands would not complete and the tree would be stuck
- Fixed other minor issues

## [1.0.7] - 2023-08-23

- Improved the speed of the tree refresh when expanding a VM item
- Added small improvements in the way we rename the VMs and Groups adding the current name as the default
- Fixed small typos here and there

## [1.0.6] - 2023-08-21

- fixed an issue where the addons would not render correctly
- further fixes to the autorefresh of the VMs

## [1.0.5] - 2023-08-21

- Added a error message if the VM packer output folder already existed

## [1.0.4] - 2023-08-21

- Fixed an issue where the extension could have multiple refresh cycles running at the same time
- Added better descriptions to the Add VMs screen
- Added the default User/Password that will be used if packer image is selected
- Added some validations to the create button simplifying the user experience

## [1.0.3] - 2023-08-18

- Updated the Ubuntu 22.04 to release 3
  
## [1.0.2] - 2023-08-18

- Fixed an issue where creating machines would fail if the folder had not been initialized

## [1.0.1] - 2023-08-17

- Changed some documentation and package.json description
- Improved the log error messages when executing command line commands

## [1.0.0] - 2023-08-17

- Fixed a bug where you could press a button while the action was already underway
- Added the ability to copy the VM Ip if known to the clipboard
- Added the new readme
- Cleaned up the code for release.
- Added the ability to set the default to run machines in a headless mode
- Further small fixes

## [0.9.0] - 2023-08-16

- Added the ability to create container
- fixed some issues when creating a container
- Added the ability to check docker images in a VM
- Added some missing new icons
- Fixed the light theme icons and colors
- Added the new "Add VM" ux design
- Further stability improvement
  
## [0.8.0] - 2023-08-15

- Added the ability to control docker from a virtual machine
- Fixed the issue with the discord server link
- Added the Helpful links section
- Added the new icons
- Added the ability to create a VM with the x86_64 architecture
- Fixed some extra bugs in the folders
- Added extra caching to the profile file
- Fixed other small issues

## [0.7.1] - 2023-08-14

- Fixed an issue with the latest version of the extension

## [0.7.0] - 2023-08-14

- Fixed an issue where you could move folders inside themselves and that would delete them
- Fixed an issue where you where unable to create a folder with the same name even if it was a subfolder
- Fixed the automatic installation of Vagrant [#22](https://github.com/Parallels/parallels-vscode-extension/issues/22) and [#30](https://github.com/Parallels/parallels-vscode-extension/issues/30)
- Improved other dependencies installation
- Improved startup speed after first initialization by caching the settings in the profile file
- Added backup of the profile file
- Added the ability to set dynamic flags when creating Virtual Machines
- Added the ability to enable/disable the rosetta flag when creating Mac Virtual Machines
- Added the ability to enable/disable the rosetta flag in the tree
- Added visual queue when VM has rosetta enabled
- Added a fix that prevents MacVMs from being able to show the take snapshot as this would crash
- added other small bug fixes

## [0.6.0] - 2023-08-10

- Fixed an issue where the VMs would not show up in the tree view
- Fixed an issue where the snapshots would generate a duplicate error

## [0.5.9] - 2023-08-09

- Fixed an issue with the Telemetry service
- Renamed the Group telemetry
  
## [0.5.8] - 2023-08-09

- Fixed an issue where you were unable to resume suspended VMs in groups
- Fixed an issue where you were unable to create a MacVM
- Fixed an issue where you were unable to create Ubuntu Machines
- Added ability to create Windows Machines
- Upgraded Packer engine to use the packer-examples repo from Parallels
- Added the ability to Hide/Show Vms
- Added the ability to Hide/Show Groups
- Added the ability to Hide/Show All Vms or Groups
- Added the ability to rename a Group
- Added the ability to show the snapshot tree in a flat way, this is configured in settings
- Further improved the UI
- Further improvements in performance

## [0.0.8] - 2023-07-12

- Added the ability to init a vagrant box and give a name to the VM

## [0.0.7] - 2023-07-03

- Updated documentation

## [0.0.6] - 2023-05-16

- Fixed an issue where we could not delete an empty group
- Fixed an issue with the confirmation dialog

## [0.0.5] - 2023-05-16

- Fixed issue with os icon not displaying correctly in details
- Fixed issue with screenshot not displaying correctly in details
- Added progress of operation to all VMs commands
- Added the ability to drag multiple machines
- Added 'preview' icon to the extension manifest -Added badge to the extension manifest
- Added more OS icons
- Added black screen is machine screenshot is not available
- fixed missing group delete icon

## [0.0.4] - 2023-05-15

- profile would be overwritten when the new version is out
- creating Vms would fail due to missing scripts
- the welcome screen was missing a button to create VMs
- some commands were being rendered in the command pallet and should not
- added the missing vagrant box refresh button
- fixed the aggressive auto-refresh for VMS

## [0.0.3] - 2023-05-13

- Improved documentation
- Added pull request template for community

## [0.0.2] - 2023-05-13

- Added documentation
  
## [0.0.1] - 2023-05-13

- Initial release of the extension
