export interface NewVirtualMachineRequest {
  name: string;
  os: string;
  platform: string;
  distro: string;
  image: string;
  specs: NewVirtualMachineSpecs;
  flags: NewVirtualMachineFlags;
  addons: string[];
}

export interface NewVirtualMachineSpecs {
  cpus: string;
  memory: string;
  disk: string;
  username: string;
  password: string;
}

export interface NewVirtualMachineFlags {
  startHeadless: boolean;
  generateVagrantBox: boolean;
}
