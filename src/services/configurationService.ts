import {FLAG_CONFIGURATION} from "../constants/flags";
import {localStorage} from "../ioc/provider";
import {VirtualMachineGroup} from "../models/virtualMachineGroup";
import {ParallelsDesktopService} from "./parallelsDesktopService";

export class ConfigurationService {
  virtualMachinesGroups: VirtualMachineGroup[];

  constructor() {
    this.virtualMachinesGroups = [];
  }

  static fromJson(json: any): ConfigurationService {
    const configuration = new ConfigurationService();
    if (json.virtualMachinesGroup !== undefined) {
      json.virtualMachinesGroup.forEach((group: VirtualMachineGroup) => {
        const newGroup = new VirtualMachineGroup(group.name);
        group.machines.forEach((vm: any) => {
          newGroup.add(vm);
        });

        configuration.virtualMachinesGroups.push(newGroup);
      });
    }

    return configuration;
  }

  toJson(): any {
    return {
      virtualMachinesGroup: this.virtualMachinesGroups
    };
  }

  existsVirtualMachineGroup(name: string): boolean {
    return this.virtualMachinesGroups.some(
      group => group.name.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  getVirtualMachineGroup(name: string): VirtualMachineGroup | undefined {
    return this.virtualMachinesGroups.find(group => group.name.toLowerCase() === name.toLowerCase());
  }

  save() {
    localStorage.set(FLAG_CONFIGURATION, this.toJson());
  }

  addVirtualMachineGroup(group: VirtualMachineGroup) {
    if (!this.existsVirtualMachineGroup(group.name)) {
      this.virtualMachinesGroups.push(group);
      this.save();
    }
  }

  deleteVirtualMachineGroup(name: string) {
    if (this.existsVirtualMachineGroup(name)) {
      this.virtualMachinesGroups = this.virtualMachinesGroups.filter(
        group => group.name.toLowerCase() !== name.toLowerCase()
      );
      this.save();
    }
  }

  inVMGroup(uuid: string): string | undefined {
    for (let i = 0; i < this.virtualMachinesGroups.length; i++) {
      const group = this.virtualMachinesGroups[i];
      if (group !== undefined && group?.exists(uuid)) {
        return group.name;
      }
    }

    return undefined;
  }

  clearVirtualMachineGroupsVms() {
    this.virtualMachinesGroups.forEach(group => group.clear());
    localStorage.set(FLAG_CONFIGURATION, this.toJson());
  }

  setVmStatus(vmId: string, status: string) {
    const groupId = this.inVMGroup(vmId);
    if (groupId) {
      const group = this.getVirtualMachineGroup(groupId);
      if (group) {
        group.machines.forEach(machine => {
          if (machine.ID === vmId) {
            machine.State = status;
          }
        });
      }
    }
  }

  countMachines(): number {
    let count = 0;
    this.virtualMachinesGroups.forEach(group => {
      count += group.machines.length;
    });

    return count;
  }
}
