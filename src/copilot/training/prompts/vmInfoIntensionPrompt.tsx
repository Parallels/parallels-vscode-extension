
import {
  PromptElement,
  PromptSizing,
  UserMessage
} from '@vscode/prompt-tsx';

import { VmInfoPromptProps } from '../properties/vmInfoPromptProps';

export class VmInfoIntensionPrompt extends PromptElement<VmInfoPromptProps, void> {
  render(state: void, sizing: PromptSizing) {
    return (
      <>
        <UserMessage>
          As a senior developer and knowing the following the following json example structure
          [
          {"{"}
          "ID": "de22df32-80e2-4e92-ba4b-efb3a66cf092",
          "Name": "Maui_DevBox",
          "Description": "",
          "Type": "VM",
          "State": "stopped",
          "OS": "win-11",
          "Template": "no",
          "Uptime": "1011878",
          "Home path": "\/Users\/cjlapao\/Parallels\/Maui_DevBox.pvm\/config.pvs",
          "Home": "\/Users\/cjlapao\/Parallels\/Maui_DevBox.pvm\/",
          "Restore Image": "",
          "GuestTools":{"{"}
          "state": "possibly_installed",
          "version": "20.0.0-55397"
          {"}"},
          "Mouse and Keyboard":{"{"}
          "Smart mouse optimized for games": "auto",
          "Sticky mouse": "off",
          "Smooth scrolling": "on",
          "Keyboard optimization mode": "auto"
          {"}"},
          "Print Management":{"{"}
          "Synchronize with host printers": "on",
          "Synchronize default printer": "on",
          "Show host printer UI": "on"
          {"}"},
          "USB and Bluetooth":{"{"}
          "Automatic sharing cameras": "on",
          "Automatic sharing bluetooth": "off",
          "Automatic sharing smart cards": "off",
          "Automatic sharing gamepads": "on",
          "Support USB 3.0": "on"
          {"}"},
          "Startup and Shutdown":{"{"}
          "Autostart": "off",
          "Autostart delay": 0,
          "Autostop": "suspend",
          "Startup view": "window",
          "On shutdown": "window",
          "On window close": "keep-running",
          "Pause idle": "off",
          "Undo disks": "off"
          {"}"},
          "Optimization":{"{"}
          "Faster virtual machine": "on",
          "Hypervisor type": "apple",
          "Adaptive hypervisor": "on",
          "Disabled Windows logo": "on",
          "Auto compress virtual disks": "off",
          "Nested virtualization": "off",
          "PMU virtualization": "off",
          "Longer battery life": "off",
          "Show battery status": "on",
          "Resource quota": "unlimited"
          {"}"},
          "Travel mode":{"{"}
          "Enter condition": "never",
          "Enter threshold": 30,
          "Quit condition": "never"
          {"}"},
          "Security":{"{"}
          "Encrypted": "no",
          "TPM enabled": "yes",
          "TPM type": "crb",
          "Custom password protection": "off",
          "Configuration is locked": "off",
          "Protected": "no",
          "Archived": "no",
          "Packed": "no"
          {"}"},
          "Smart Guard":{"{"}
          "enabled": false
          {"}"},
          "Modality":{"{"}
          "Opacity (percentage)": 50,
          "Stay on top": "on",
          "Show on all spaces ": "on",
          "Capture mouse clicks": "on"
          {"}"},
          "Fullscreen":{"{"}
          "Use all displays": "off",
          "Activate spaces on click": "on",
          "Optimize for games": "off",
          "Gamma control": "on",
          "Scale view mode": "auto"
          {"}"},
          "Coherence":{"{"}
          "Show Windows systray in Mac menu": "off",
          "Auto-switch to full screen": "off",
          "Disable aero": "off",
          "Hide minimized windows": "off"
          {"}"},
          "Time Synchronization":{"{"}
          "enabled": true,
          "Smart mode": "off",
          "Interval (in seconds)": 60,
          "Timezone synchronization disabled": "off"
          {"}"},
          "Expiration":{"{"}
          "enabled": false
          {"}"},
          "Boot order": "cdrom0 hdd0 net0 ",
          "BIOS type": "efi-arm64",
          "EFI Secure boot": "off",
          "Allow select boot device": "off",
          "External boot device": "",
          "SMBIOS settings":{"{"}
          "BIOS Version": "",
          "System serial number": "",
          "Board Manufacturer": ""
          {"}"},
          "Hardware":{"{"}
          "cpu":{"{"}
          "cpus": 4,
          "auto": "off",
          "VT-x": true,
          "hotplug": false,
          "accl": "high",
          "mode": "64",
          "type": "arm"
          {"}"},
          "memory":{"{"}
          "size": "8192Mb",
          "auto": "on",
          "hotplug": false
          {"}"},
          "video":{"{"}
          "adapter-type": "parallels",
          "size": "0Mb",
          "3d-acceleration": "highest",
          "vertical-sync": "on",
          "high-resolution": "off",
          "high-resolution-in-guest": "off",
          "native-scaling-in-guest": "off",
          "automatic-video-memory": "on"
          {"}"},
          "memory_quota":{"{"}
          "auto": "yes"
          {"}"},
          "hdd0":{"{"}
          "enabled": true,
          "port": "sata:0",
          "image": "\/Users\/cjlapao\/Parallels\/Maui_DevBox.pvm\/harddisk1.hdd",
          "type": "expanded",
          "size": "131072Mb",
          "online-compact": "on"
          {"}"},
          "cdrom0":{"{"}
          "enabled": true,
          "port": "sata:1",
          "image": "",
          "state": "disconnected"
          {"}"},
          "usb":{"{"}
          "enabled": true
          {"}"},
          "net0":{"{"}
          "enabled": true,
          "type": "shared",
          "mac": "001C4235AFAE",
          "card": "virtio",
          "dhcp": "yes"
          {"}"},
          "sound0":{"{"}
          "enabled": true,
          "output": "Default",
          "mixer": "Default"
          {"}"}
          {"}"},
          "Host Shared Folders":{"{"}
          "enabled": true,
          "Maui Weather":{"{"}
          "enabled": true,
          "path": "~\/code\/Examples\/maui-samples\/8.0\/Apps\/WeatherTwentyOne\/src",
          "mode": "rw"
          {"}"},
          "prlctl-scripts":{"{"}
          "enabled": false,
          "path": "~\/code\/GitHub\/prlctl-scripts",
          "mode": "rw"
          {"}"},
          "weather_twenty_one_maui":{"{"}
          "enabled": false,
          "path": "~\/code\/GitHub\/Locally-build\/weather_twenty_one_maui",
          "mode": "rw"
          {"}"},
          "Locally-build":{"{"}
          "enabled": true,
          "path": "~\/code\/GitHub\/Locally-build",
          "mode": "rw"
          {"}"}
          {"}"},
          "Host defined sharing": "User home directory",
          "Guest Shared Folders":{"{"}
          "enabled": false
          {"}"},
          "Shared Profile":{"{"}
          "enabled": false
          {"}"},
          "Shared Applications":{"{"}
          "enabled": true,
          "Host-to-guest apps sharing": "off",
          "Guest-to-host apps sharing": "on",
          "Show guest apps folder in Dock": "off",
          "Show guest notifications": "on",
          "Bounce dock icon when app flashes": "on"
          {"}"},
          "SmartMount":{"{"}
          "enabled": false
          {"}"},
          "Network":{"{"}
          "Conditioned": "off",
          "ipAddresses": [{"{"}"type":"ipv4","ip":"169.254.249.92"{"}"},{"{"}"type":"ipv6","ip":"fe80::e359:c5b0:e8d3:f830"{"}"}]
          {"}"},
          "Miscellaneous Sharing":{"{"}
          "Shared clipboard mode": "on",
          "Shared cloud": "off"
          {"}"},
          "Advanced":{"{"}
          "VM hostname synchronization": "off",
          "Public SSH keys synchronization": "off",
          "Show developer tools": "on",
          "Swipe from edges": "off",
          "Share host location": "on",
          "Rosetta Linux": "off"
          {"}"}
          {"}"}
          ]
          careful analyze the user input and your task is to generate a json object with the following structure:
          [
          {"{"}
          "intension": "VM_INFO",
          "operation": "DISK_SIZE",
          "operation_value": "100mb",
          "target": "Maui_DevBox",
          "intension_description": "The disk size of the VM 'Maui_DevBox' is '100mb'"
          {"}"}
          ]
          to fulfill the user request
          be aware of your task, you should not generate any other text our output other than the json object.
          we will need the input to use in another part of the system.
        
          for example:
          get the disk size of the Maui_DevBox
          should generate the json object:
          [
          {"{"}
          "intension": "VM_INFO",
          "operation": "DISK_SIZE",
          "operation_value": "131072Mb",
          "target": "Maui_DevBox",
          "intension_description": "The disk size of the VM 'Maui_DevBox' is '131072Mb'"
          {"}"}
          ]
          another example is:
          get the state of the Maui_DevBox
          should generate the json object:
          [
          {"{"}
          "intension": "VM_INFO",
          "operation": "STATE",
          "operation_value": "stopped",
          "target": "Maui_DevBox",
          "intension_description": "The state of the VM 'Maui_DevBox' is 'stopped'"
          {"}"}
          ]
          another example is:
          get the uptime of the Maui_DevBox
          should generate the json object:
          [
          {"{"}
          "intension": "VM_INFO",
          "operation": "UPTIME",
          "operation_value": "1011878",
          "target": "Maui_DevBox",
          "intension_description": "the uptime of the VM 'Maui_DevBox' is '1011878' seconds"
          {"}"}
          ]
          another example is:
          get the ip address of the Maui_DevBox
          should generate the json object:
          [
          {"{"}
          "intension": "VM_INFO",
          "operation": "IP_ADDRESS",
          "operation_value": "169.254.249.92",
          "target": "Maui_DevBox",
          "intension_description": "The ip address of the VM 'Maui_DevBox' is '169.254.249.92'"
          {"}"}
          ]
          The user will provide you with the Json object to fulfill the request.
          if you think you have missing information to fulfill the user request, look at the user history provided below to look for clues.
        </UserMessage>
        <UserMessage>This is the History of the user chat:
          {this.props.history}
        </UserMessage>
        <UserMessage>This is the User Query:
          {this.props.userQuery}
        </UserMessage>
        <UserMessage>This is the VM Info Object:
          {this.props.VmInfoObject}
        </UserMessage>
      </>
    );
  }
}