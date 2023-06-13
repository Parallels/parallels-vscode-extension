import * as uuid from "uuid";
import {VirtualMachine as VirtualMachine} from "./virtualMachine";

export class VirtualMachineGroup {
  uuid: string;
  name: string;
  machines: VirtualMachine[] = [];

  constructor(name: string) {
    this.uuid = uuid.v4();
    this.name = name;
  }

  exists(name: string): boolean {
    return this.machines.some(
      machine => machine.Name.toLowerCase() === name.toLowerCase() || machine.ID.toLowerCase() === name.toLowerCase()
    );
  }

  get(name: string): VirtualMachine | undefined {
    return this.machines.find(machine => machine.Name.toLowerCase() === name.toLowerCase());
  }

  add(machine: VirtualMachine): void {
    if (!this.exists(machine.Name)) {
      machine.group = this.name;
      this.machines.push(machine);
    } else {
      for (const vm of this.machines) {
        if (vm.Name.toLowerCase() === machine.Name.toLowerCase()) {
          vm.State = machine.State;
        }
      }
    }
  }

  remove(name: string): void {
    if (this.exists(name)) {
      this.machines = this.machines.filter(machine => machine.Name.toLowerCase() !== name.toLowerCase());
      this.machines = this.machines.filter(machine => machine.ID.toLowerCase() !== name.toLowerCase());
    }
  }

  clear(): void {
    this.machines = [];
  }
}
