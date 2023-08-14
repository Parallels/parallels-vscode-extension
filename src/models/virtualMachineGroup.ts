import * as uuid from "uuid";
import {VirtualMachine as VirtualMachine} from "./virtualMachine";
import {Provider} from "../ioc/provider";
import {FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY} from "../constants/flags";

export class VirtualMachineGroup {
  uuid: string;
  name: string;
  hidden: boolean;
  parent?: string;
  path?: string;
  machines: VirtualMachine[] = [];
  groups: VirtualMachineGroup[] = [];

  constructor(name: string, id?: string, parent?: string, hidden?: boolean, path?: string) {
    this.uuid = id ?? uuid.v4();
    this.name = name;
    this.hidden = hidden ?? false;
    this.parent = parent ?? undefined;
    this.path = path ?? undefined;
  }

  static fromJson(json: any, path?: string): VirtualMachineGroup {
    const group = JSON.parse(json);
    const newGroup = new VirtualMachineGroup(group.name, group.uuid, group.parent, group.hidden);
    newGroup.path = path ? `${path}/${newGroup.name}` : `/${newGroup.name}`;

    if (group.machines !== undefined) {
      group.machines.forEach((vm: any) => {
        newGroup.addVm(vm);
      });
    }

    if (group.groups !== undefined) {
      group.groups.forEach((subGroup: any) => {
        const jsonGroup = JSON.stringify(subGroup);
        const testPath = newGroup.path;
        newGroup.addGroup(VirtualMachineGroup.fromJson(jsonGroup, testPath));
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
    if (!this.existsVm(machine.ID)) {
      machine.group = this.uuid;
      this.machines.push(machine);
    } else {
      this.machines.forEach((vm, index) => {
        if (vm.Name.toLowerCase() === machine.Name.toLowerCase() || vm.ID.toLowerCase() === machine.ID.toLowerCase()) {
          this.machines[index] = machine;
        }
      });
    }
    this.sortVms();
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
      group.path = group.path ? `${this.path}/${group.name}` : `/${group.name}`;
      this.groups.push(group);
    }
    this.sortGroups();
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
    const settings = Provider.getSettings();
    if (settings.get<boolean>(FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY)) {
      this.machines.sort((a, b) => a.Name.localeCompare(b.Name));
    }
  }

  sortGroups(): void {
    const settings = Provider.getSettings();
    if (settings.get<boolean>(FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY)) {
      this.groups.sort((a, b) => a.name.localeCompare(b.name));
    }
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
