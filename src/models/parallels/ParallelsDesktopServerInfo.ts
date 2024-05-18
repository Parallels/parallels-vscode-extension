import {ParallelsDesktopHardwareInfo} from "./ParallelsDesktopHardwareInfo";
import {ParallelsDesktopLicense} from "./ParallelsDesktopLicense";
import {ParallelsDesktopMemoryLimit} from "./ParallelsDesktopMemoryLimit";

export interface ParallelsDesktopServerInfo {
  ID: string;
  Hostname: string;
  OS: string;
  Version: string;
  "Build flags": string;
  "Started as service": string;
  "VM home": string;
  "Memory limit": ParallelsDesktopMemoryLimit;
  "Minimal security level": string;
  "Manage settings for new users": string;
  "CEP mechanism": string;
  "Verbose log": string;
  "Log rotation": string;
  "External device auto connect": string;
  "Web portal domain": string;
  "Host ID": string;
  "Allow attach screenshots": string;
  "Custom password protection": string;
  "Preferences are locked": string;
  "Disable deleting report archive": string;
  "Add serial port output to report": string;
  License: ParallelsDesktopLicense;
  "Hardware Id": string;
  "Signed In": string;
  "Hardware info": {[key: string]: ParallelsDesktopHardwareInfo};
}
