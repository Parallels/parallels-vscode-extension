import {NewVirtualMachineFlags} from "./NewVirtualMachineFlags";
import {NewVirtualMachineRequiredVariables} from "./NewVirtualMachineRequiredVariables";
import {NewVirtualMachineSpecs} from "./NewVirtualMachineSpecs";

export interface NewVirtualMachineRequest {
  name: string;
  os: string;
  platform: string;
  distro: string;
  image: string;
  specs?: NewVirtualMachineSpecs;
  flags?: any[];
  isoUrl?: string;
  isoChecksum?: string;
  addons: string[];
  requiredVariables: NewVirtualMachineRequiredVariables[];
}
