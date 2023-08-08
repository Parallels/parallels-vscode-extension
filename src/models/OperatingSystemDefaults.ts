import {OperatingSystemSpecs} from "./OperatingSystemSpecs";
import {OperatingSystemUser} from "./OperatingSystemUser";

export class OperatingSystemDefaults {
  specs: OperatingSystemSpecs | undefined;
  user: OperatingSystemUser | undefined;

  constructor(specs?: OperatingSystemSpecs, user?: OperatingSystemUser) {
    this.specs = specs;
    this.user = user;
  }

  toString() {
    return `{
      specs: ${this.specs},
      user: ${this.user}
    }`;
  }

  static fromJson(json: string): OperatingSystemDefaults {
    const obj = JSON.parse(json);
    const specs = obj.specs ? OperatingSystemSpecs.fromJson(JSON.stringify(obj.specs)) : undefined;
    const user = obj.user ? OperatingSystemUser.fromJson(JSON.stringify(obj.user)) : undefined;
    return new OperatingSystemDefaults(specs, user);
  }
}
