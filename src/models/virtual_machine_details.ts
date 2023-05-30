export interface VirtualMachineDetails {
  ID: string;
  Name: string;
  Description: string;
  Type: string;
  State: string;
  OS: string;
  Template: string;
  Uptime: string;
  "Home path": string;
  Home: string;
  GuestTools: GuestTools;
  "Mouse and Keyboard": MouseAndKeyboard;
  "USB and Bluetooth": USBAndBluetooth;
  "Startup and Shutdown": StartupAndShutdown;
  Optimization: Optimization;
  "Travel mode": TravelMode;
  Security: Security;
  "Smart Guard": Expiration;
  Modality: Modality;
  Fullscreen: Fullscreen;
  Coherence: Coherence;
  "Time Synchronization": TimeSynchronization;
  Expiration: Expiration;
  "Boot order": string;
  "BIOS type": string;
  "EFI Secure boot": string;
  "Allow select boot device": string;
  "External boot device": string;
  "SMBIOS settings": SMBIOSSettings;
  Hardware: Hardware;
  "Host Shared Folders": Expiration;
  "Host defined sharing": string;
  "Shared Profile": Expiration;
  "Shared Applications": SharedApplications;
  SmartMount: SmartMount;
  "Miscellaneous Sharing": MiscellaneousSharing;
  Advanced: Advanced;
}

export interface Advanced {
  "VM hostname synchronization": string;
  "Public SSH keys synchronization": string;
  "Show developer tools": string;
  "Swipe from edges": string;
  "Share host location": string;
}

export interface Coherence {
  "Show Windows systray in Mac menu": string;
  "Auto-switch to full screen": string;
  "Disable aero": string;
  "Hide minimized windows": string;
}

export interface Expiration {
  enabled: boolean;
}

export interface Fullscreen {
  "Use all displays": string;
  "Activate spaces on click": string;
  "Optimize for games": string;
  "Gamma control": string;
  "Scale view mode": string;
}

export interface GuestTools {
  state: string;
}

export interface Hardware {
  cpu: CPU;
  memory: Memory;
  video: Video;
  memory_quota: MemoryQuota;
  hdd0: Hdd0;
  cdrom0: Cdrom0;
  usb: Expiration;
  net0: Net0;
  sound0: Sound0;
}

export interface Cdrom0 {
  enabled: boolean;
  port: string;
  image: string;
  state: string;
}

export interface CPU {
  cpus: number;
  auto: string;
  "VT-x": boolean;
  hotplug: boolean;
  accl: string;
  mode: string;
  type: string;
}

export interface Hdd0 {
  enabled: boolean;
  port: string;
  image: string;
  type: string;
  size: string;
  "online-compact": string;
}

export interface Memory {
  size: string;
  auto: string;
  hotplug: boolean;
}

export interface MemoryQuota {
  auto: string;
}

export interface Net0 {
  enabled: boolean;
  type: string;
  mac: string;
  card: string;
}

export interface Sound0 {
  enabled: boolean;
  output: string;
  mixer: string;
}

export interface Video {
  "adapter-type": string;
  size: string;
  "3d-acceleration": string;
  "vertical-sync": string;
  "high-resolution": string;
  "high-resolution-in-guest": string;
  "native-scaling-in-guest": string;
  "automatic-video-memory": string;
}

export interface MiscellaneousSharing {
  "Shared clipboard": string;
  "Shared cloud": string;
}

export interface Modality {
  "Opacity (percentage)": number;
  "Stay on top": string;
  "Show on all spaces ": string;
  "Capture mouse clicks": string;
}

export interface MouseAndKeyboard {
  "Smart mouse optimized for games": string;
  "Sticky mouse": string;
  "Smooth scrolling": string;
  "Keyboard optimization mode": string;
}

export interface Optimization {
  "Faster virtual machine": string;
  "Hypervisor type": string;
  "Adaptive hypervisor": string;
  "Disabled Windows logo": string;
  "Auto compress virtual disks": string;
  "Nested virtualization": string;
  "PMU virtualization": string;
  "Longer battery life": string;
  "Show battery status": string;
  "Resource quota": string;
}

export interface SMBIOSSettings {
  "BIOS Version": string;
  "System serial number": string;
  "Board Manufacturer": string;
}

export interface Security {
  Encrypted: string;
  "TPM enabled": string;
  "TPM type": string;
  "Custom password protection": string;
  "Configuration is locked": string;
  Protected: string;
  Archived: string;
}

export interface SharedApplications {
  enabled: boolean;
  "Host-to-guest apps sharing": string;
  "Guest-to-host apps sharing": string;
  "Show guest apps folder in Dock": string;
  "Show guest notifications": string;
  "Bounce dock icon when app flashes": string;
}

export interface SmartMount {
  enabled: boolean;
  "Removable drives": string;
  "CD/DVD drives": string;
  "Network shares": string;
}

export interface StartupAndShutdown {
  Autostart: string;
  "Autostart delay": number;
  Autostop: string;
  "Startup view": string;
  "On shutdown": string;
  "On window close": string;
  "Pause idle": string;
  "Undo disks": string;
}

export interface TimeSynchronization {
  enabled: boolean;
  "Smart mode": string;
  "Interval (in seconds)": number;
  "Timezone synchronization disabled": string;
}

export interface TravelMode {
  "Enter condition": string;
  "Enter threshold": number;
  "Quit condition": string;
}

export interface USBAndBluetooth {
  "Automatic sharing cameras": string;
  "Automatic sharing bluetooth": string;
  "Automatic sharing smart cards": string;
  "Automatic sharing gamepads": string;
  "Support USB 3.0": string;
}
