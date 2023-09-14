import {OperatingSystemDefaults} from "./OperatingSystemDefaults";
import {OperatingSystemImageAddons} from "./OperatingSystemImageAddons";
import {OperatingSystemImageFlag} from "./OperatingSystemImageFlag";
import { OperatingSystemRequiredVariable } from "./OperatingSystemRequiredVariable";

export class IsoHelp {
  prefixText: string | undefined;
  urlText: string | undefined;
  url: string | undefined;
  suffixText: string | undefined;

  constructor(prefixText?: string, urlText?: string, url?: string, suffixText?: string) {
    this.prefixText = prefixText;
    this.urlText = urlText;
    this.url = url;
    this.suffixText = suffixText;
  }

  toString() {
    return `{
      prefixText: ${this.prefixText !== undefined ? `'${this.prefixText}'` : undefined},
      urlText: ${this.urlText !== undefined ? `'${this.urlText}'` : undefined},
      url: ${this.url !== undefined ? `'${this.url}'` : undefined},
      suffixText: ${this.suffixText !== undefined ? `'${this.suffixText}'` : undefined}
    }`;
  }

  static fromJson(json: string): IsoHelp {
    const obj = JSON.parse(json);
    return new IsoHelp(obj.prefixText, obj.urlText, obj.url, obj.suffixText);
  }
}

export class OperatingSystemImage {
  id: string;
  name: string;
  type: "packer" | "iso" | "vagrant" | "internal" | "macos";
  distro: string;
  requireIsoDownload: boolean;
  description: string | undefined;
  variables: any;
  requiredVariables: OperatingSystemRequiredVariable[];
  addons: OperatingSystemImageAddons[];
  isoUrl: string;
  isoHelp: IsoHelp | undefined;
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
    description: string | undefined = undefined,
    variables: any,
    requiredVariables: OperatingSystemRequiredVariable[] = [],
    addons: OperatingSystemImageAddons[] = [],
    isoUrl = "",
    isoChecksum = "",
    isoHelp: IsoHelp | undefined = undefined,
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
    this.description = description;
    this.variables = variables;
    this.requiredVariables = requiredVariables;
    this.addons = addons;
    this.isoUrl = isoUrl;
    this.isoHelp = isoHelp;
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
      description: ${this.description !== undefined ? `'${this.description}'` : undefined},
      isoUrl: '${this.isoUrl}',
      ${this.isoHelp ? `\nisoHelp: ${this.isoHelp.toString()},` : ""}
      isoChecksum: '${this.isoChecksum}',
      requiredVariables: ${JSON.stringify(this.requiredVariables, null, 2).replace(/"/g, "'")},
      allowMachineSpecs: ${this.allowMachineSpecs},
      allowUserOverride: ${this.allowUserOverride},
      allowAddons: ${this.allowAddons},
      allowedFlags: ${JSON.stringify(this.allowedFlags, null, 2).replace(/"/g, "'")},
      addons: ${JSON.stringify(this.addons).replace(/"/g, "'")},
      requiredVariables: ${JSON.stringify(this.requiredVariables).replace(/"/g, "'")}
      ${this.defaults ? `,\ndefaults: ${this.defaults.toString()}` : ""}
    }`;
  }

  static fromJson(json: string): OperatingSystemImage {
    const obj = JSON.parse(json);
    const addons: OperatingSystemImageAddons[] = [];
    for (const addon of obj.addons ?? []) {
      addons.push(OperatingSystemImageAddons.fromJson(JSON.stringify(addon)));
    }
    const requiredVariables: OperatingSystemRequiredVariable[] = [];
    for (const requiredVariable of obj.requiredVariables ?? []) {
      requiredVariables.push(OperatingSystemRequiredVariable.fromJson(JSON.stringify(requiredVariable)));
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

    const isoHelp: IsoHelp | undefined = obj.isoHelp ? IsoHelp.fromJson(JSON.stringify(obj.isoHelp)) : undefined;

    return new OperatingSystemImage(
      obj.id,
      obj.name,
      obj.distro,
      obj.type,
      obj.requireIsoDownload,
      obj.description,
      obj.variables,
      requiredVariables,
      addons,
      obj.isoUrl,
      obj.isoChecksum,
      isoHelp,
      obj.packerFolder,
      obj.allowMachineSpecs,
      obj.allowUserOverride,
      obj.allowAddons,
      obj.allowedFlags,
      defaults
    );
  }
}
