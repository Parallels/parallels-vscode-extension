import {MachineSpecs} from "./MachineSpecs";

export interface PackerVirtualMachineConfig {
  id: string;
  base: string;
  platform: string;
  distro: string;
  name: string;
  isoUrl: string;
  isoChecksum: string;
  generateVagrantBox: boolean;
  outputFolder: string;
  packerScriptFolder: string;
  variables: any;
  specs: MachineSpecs;
  addons: string[];
  forceBuild: boolean;
}
