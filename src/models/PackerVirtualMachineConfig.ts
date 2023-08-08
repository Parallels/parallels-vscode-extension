import {MachineSpecs} from "./MachineSpecs";

export interface PackerVirtualMachineConfig {
  id: string;
  base: string;
  platform: string;
  distro: string;
  name: string;
  isoChecksum: string;
  isoUrl: string;
  generateVagrantBox: boolean;
  outputFolder: string;
  packerScriptFolder: string;
  variables: Map<string, any>;
  specs: MachineSpecs;
  addons: string[];
}
