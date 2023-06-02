import * as uuid from "uuid";
import {ParallelsVirtualMachine} from "./virtual_machine";

export class VirtualMachineGroup {
  uuid: string;
  name: string;
  machines: ParallelsVirtualMachine[] = [];

  constructor(name: string) {
    this.uuid = uuid.v4();
    this.name = name;
  }

  exists(name: string): boolean {
    return this.machines.some(
      machine => machine.name.toLowerCase() === name.toLowerCase() || machine.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  get(name: string): ParallelsVirtualMachine | undefined {
    return this.machines.find(machine => machine.name.toLowerCase() === name.toLowerCase());
  }

  add(machine: ParallelsVirtualMachine): void {
    if (!this.exists(machine.name)) {
      machine.group = this.name;
      this.machines.push(machine);
    }
  }

  remove(name: string): void {
    if (this.exists(name)) {
      this.machines = this.machines.filter(machine => machine.name.toLowerCase() !== name.toLowerCase());
    }
  }

  clear(): void {
    this.machines = [];
  }
}
