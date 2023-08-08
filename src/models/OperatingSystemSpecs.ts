export class OperatingSystemSpecs {
  cpus: number;
  memory: number;
  diskSize: string;

  constructor(cpus: number, memory: number, diskSize: string) {
    this.cpus = cpus;
    this.memory = memory;
    this.diskSize = diskSize;
  }

  toString() {
    return `{
      cpus: ${this.cpus},
      memory: ${this.memory},
      diskSize: '${this.diskSize}'
    }`;
  }

  static fromJson(json: string): OperatingSystemSpecs {
    const obj = JSON.parse(json);
    return new OperatingSystemSpecs(obj.cpus, obj.memory, obj.diskSize);
  }
}
