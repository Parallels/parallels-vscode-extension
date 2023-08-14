import {stringify} from "querystring";
import {OperatingSystemDefaults} from "./OperatingSystemDefaults";
import {OperatingSystemImageAddons} from "./OperatingSystemImageAddons";
import {OperatingSystemImageFlag} from "./OperatingSystemImageFlag";

export class OperatingSystemImage {
  id: string;
  name: string;
  type: "packer" | "iso" | "vagrant" | "internal" | "macos";
  distro: string;
  requireIsoDownload: boolean;
  variables: any;
  addons: OperatingSystemImageAddons[];
  isoUrl: string;
  isoChecksum: string;
  packerFolder: string;
  allowMachineSpecs: boolean;
  allowUserOverride: boolean;
  allowAddons: boolean;
  defaults: OperatingSystemDefaults | undefined;
  allowedFlags: OperatingSystemImageFlag[] = [];

  constructor(
    id: string,
    name: string,
    distro = "",
    type: "packer" | "iso" | "vagrant" | "internal" | "macos" = "internal",
    requireIsoDownload = false,
    variables: any,
    addons: OperatingSystemImageAddons[] = [],
    isoUrl = "",
    isoChecksum = "",
    packerFolder = "",
    allowMachineSpecs = false,
    allowUserOverride = false,
    allowAddons = false,
    allowedFlags = [],
    defaults: OperatingSystemDefaults | undefined = undefined
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.distro = distro;
    this.requireIsoDownload = requireIsoDownload;
    this.variables = variables;
    this.addons = addons;
    this.isoUrl = isoUrl;
    this.isoChecksum = isoChecksum;
    this.packerFolder = packerFolder;
    this.allowMachineSpecs = allowMachineSpecs;
    this.allowUserOverride = allowUserOverride;
    this.allowAddons = allowAddons;
    this.allowedFlags = allowedFlags;
    this.defaults = defaults;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      distro: '${this.distro}',
      type: '${this.type}',
      requireIsoDownload: ${this.requireIsoDownload},
      isoUrl: '${this.isoUrl}',
      isoChecksum: '${this.isoChecksum}',
      allowMachineSpecs: ${this.allowMachineSpecs},
      allowUserOverride: ${this.allowUserOverride},
      allowAddons: ${this.allowAddons},
      allowedFlags: ${JSON.stringify(this.allowedFlags).replace(/"/g, "'")},
      addons: ${JSON.stringify(this.addons).replace(/"/g, "'")}
      ${this.defaults ? `,\ndefaults: ${this.defaults.toString()}` : ""}
    }`;
  }

  static fromJson(json: string): OperatingSystemImage {
    const obj = JSON.parse(json);
    const addons: OperatingSystemImageAddons[] = [];
    for (const addon of obj.addons ?? []) {
      addons.push(OperatingSystemImageAddons.fromJson(JSON.stringify(addon)));
    }
    const bootCommand: string[] = [];
    for (const command of obj.bootCommand ?? []) {
      bootCommand.push(command);
    }
    const httpContents: string[] = [];
    for (const httpContent of obj.httpContents ?? []) {
      httpContents.push(httpContent);
    }
    const defaults = obj.defaults ? OperatingSystemDefaults.fromJson(JSON.stringify(obj.defaults)) : undefined;

    return new OperatingSystemImage(
      obj.id,
      obj.name,
      obj.distro,
      obj.type,
      obj.requireIsoDownload,
      obj.variables,
      addons,
      obj.isoUrl,
      obj.isoChecksum,
      obj.packerFolder,
      obj.allowMachineSpecs,
      obj.allowUserOverride,
      obj.allowAddons,
      obj.allowedFlags,
      defaults
    );
  }
}
