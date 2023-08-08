
export interface VirtualMachineCPU {
  cpus: number;
  auto: string;
  "VT-x": boolean;
  hotplug: boolean;
  accl: string;
  mode: string;
  type: string;
}
