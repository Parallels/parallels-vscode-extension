import * as uuid from "uuid";
import {VirtualMachine as VirtualMachine} from "./virtualMachine";
import {Provider} from "../ioc/provider";

export class VirtualMachineGroup {
  uuid: string;
  name: string;
  hidden: boolean;
  parent?: string;
  machines: VirtualMachine[] = [];
  groups: VirtualMachineGroup[] = [];

  constructor(name: string, id?: string, parent?: string, hidden?: boolean) {
    this.uuid = id ?? uuid.v4();
    this.name = name;
    this.hidden = hidden ?? false;
    this.parent = parent ?? undefined;
  }

  static fromJson(json: any): VirtualMachineGroup {
    const group = JSON.parse(json);
    const newGroup = new VirtualMachineGroup(group.name, group.uuid, group.parent, group.hidden);

    if (group.machines !== undefined) {
      group.machines.forEach((vm: any) => {
        newGroup.addVm(vm);
      });
    }

    if (group.groups !== undefined) {
      group.groups.forEach((subGroup: any) => {
        const jsonGroup = JSON.stringify(subGroup);
        newGroup.addGroup(VirtualMachineGroup.fromJson(jsonGroup));
      });
    }

    return newGroup;
  }

  existsVm(name: string): boolean {
    return this.machines.some(
      machine => machine.Name.toLowerCase() === name.toLowerCase() || machine.ID.toLowerCase() === name.toLowerCase()
    );
  }

  existsGroup(name: string): boolean {
    return this.groups.some(
      group => group.name.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  getVm(name: string): VirtualMachine | undefined {
    return this.machines.find(
      machine => machine.Name.toLowerCase() === name.toLowerCase() || machine.ID.toLowerCase() === name.toLowerCase()
    );
  }

  getGroup(name: string): VirtualMachineGroup | undefined {
    return this.groups.find(
      group => group.name.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  addVm(machine: VirtualMachine): void {
    if (!this.existsVm(machine.Name)) {
      machine.group = this.name;
      this.machines.push(machine);
    } else {
      for (const vm of this.machines) {
        if (vm.Name.toLowerCase() === machine.Name.toLowerCase() || vm.ID.toLowerCase() === machine.ID.toLowerCase()) {
          vm.State = machine.State;
          vm.group = machine.group;
          vm.hidden = machine.hidden;
        }
      }
    }
  }

  getAllVms(): VirtualMachine[] {
    const result: VirtualMachine[] = [];
    result.push(...this.machines);
    const groups = this.getAllGroups();
    for (const group of groups) {
      result.push(...group.machines);
    }

    return result;
  }

  addGroup(group: VirtualMachineGroup): void {
    if (!this.existsGroup(group.name)) {
      group.parent = this.uuid;
      this.groups.push(group);
    }
  }

  getAllGroups(): VirtualMachineGroup[] {
    const result: VirtualMachineGroup[] = [];
    for (const group of this.groups) {
      result.push(group);
      result.push(...group.getAllGroups());
    }

    return result;
  }

  removeVm(name: string): void {
    if (this.existsVm(name)) {
      this.machines = this.machines.filter(machine => machine.Name.toLowerCase() !== name.toLowerCase());
      this.machines = this.machines.filter(machine => machine.ID.toLowerCase() !== name.toLowerCase());
    }
  }

  removeGroup(name: string): void {
    if (this.existsGroup(name)) {
      this.groups = this.groups.filter(group => group.name.toLowerCase() !== name.toLowerCase());
      this.groups = this.groups.filter(group => group.uuid.toLowerCase() !== name.toLowerCase());
    }
  }

  get visibleGroupsCount(): number {
    const groups = this.getAllGroups();
    let count = 0;
    for (const group of groups) {
      if (!group.hidden || Provider.getConfiguration().showHidden) {
        count++;
      }
    }

    return count;
  }

  get visibleVmsCount(): number {
    const vms = this.getAllVms();
    let count = 0;
    for (const vm of vms) {
      const group = this.getGroup(vm.group);
      if ((!vm.hidden && !group?.hidden) || Provider.getConfiguration().showHidden) {
        count++;
      }
    }

    return count;
  }

  sortVms(): void {
    this.machines.sort((a, b) => a.Name.localeCompare(b.Name));
  }

  sortGroups(): void {
    this.groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  sortAll(): void {
    this.sortVms();
    this.sortGroups();
    for (const group of this.groups) {
      group.sortAll();
    }
  }

  get state(): string {
    const vms = this.getAllVms();
    let currentState = "unknown";
    for (const vm of vms) {
      if (currentState === "unknown") {
        currentState = vm.State;
      }

      if (vm.State !== currentState) {
        currentState = "mixed";
        break;
      } else {
        currentState = vm.State;
      }
    }

    return currentState;
  }

  clear(): void {
    this.machines = [];
    this.groups = [];
  }
}
