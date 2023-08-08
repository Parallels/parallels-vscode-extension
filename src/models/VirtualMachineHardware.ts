import { VirtualMachineExpiration } from "./VirtualMachineExpiration";
import { VirtualMachineVideo } from "./VirtualMachineVideo";
import { VirtualMachineSound } from "./VirtualMachineSound";
import { VirtualMachineNet } from "./VirtualMachineNet";
import { VirtualMachineMemoryQuota } from "./VirtualMachineMemoryQuota";
import { VirtualMachineMemory } from "./VirtualMachineMemory";
import { VirtualMachineHdd } from "./VirtualMachineHdd";
import { VirtualMachineCPU } from "./VirtualMachineCPU";
import { VirtualMachineCdrom } from "./VirtualMachineCdrom";


export interface VirtualMachineHardware {
  cpu: VirtualMachineCPU;
  memory: VirtualMachineMemory;
  video: VirtualMachineVideo;
  memory_quota: VirtualMachineMemoryQuota;
  hdd0: VirtualMachineHdd;
  cdrom0: VirtualMachineCdrom;
  usb: VirtualMachineExpiration;
  net0: VirtualMachineNet;
  sound0: VirtualMachineSound;
}
