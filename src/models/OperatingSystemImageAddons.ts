export class OperatingSystemImageAddons {
  id: string;
  name: string;
  deploy: boolean;

  constructor(id: string, name: string, deploy = false) {
    this.id = id;
    this.name = name;
    this.deploy = deploy;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      deploy: ${this.deploy}
    }`;
  }

  static fromJson(json: string): OperatingSystemImageAddons {
    const obj = JSON.parse(json);
    return new OperatingSystemImageAddons(obj.id, obj.name, obj.deploy);
  }
}
