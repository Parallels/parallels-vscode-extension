export interface VirtualMachineSpecs {
    guestOs: string;
    base: string;
    platform: string;
    distro: string;
    toolsFlavor: string;
    user: string;
    password: string;
    name: string;
    memory: number;
    cpus: number;
    diskSize: number;
    bootCommand: string[];
    bootWait: string;
    isoChecksum: string;
    isoUrl: string;
    shutdownCommand: string;
    shutdownTimeout: string;
    sshPassword: string;
    sshPort: number;
    sshTimeout: string;
    sshUsername: string;
    sshWaitTimeout: string;
    vmName: string;
    addons: string[];
}
