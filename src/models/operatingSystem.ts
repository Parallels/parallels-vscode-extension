import * as vscode from "vscode";
import * as path from "path";

export class OperatingSystemsData {
  operatingSystems: OperatingSystem[];

  constructor(private context: vscode.ExtensionContext) {
    this.operatingSystems = [];
  }

  async get(): Promise<OperatingSystem[]> {
    const osFileName = vscode.Uri.file(path.join(this.context.extensionPath, "data", "os.json"));
    const file = await vscode.workspace.fs.readFile(osFileName);
    const jsonObj = JSON.parse(file.toString());
    jsonObj.forEach((os: any) => {
      this.operatingSystems.push(OperatingSystem.fromJson(JSON.stringify(os)));
    });

    return this.operatingSystems;
  }

  getImage(osId: string, platformId: string, distroId: string, imageId: string): OperatingSystemImage | undefined {
    const os = this.operatingSystems.find(os => os.id === osId);
    if (!os) {
      return undefined;
    }

    const platform = os.platforms.find(platform => platform.id === platformId);
    if (!platform) {
      return undefined;
    }
    if (distroId === undefined || distroId === null || distroId === "" || distroId === "undefined") {
      const image = platform.images.find(image => image.id === imageId);
      if (!image) {
        return undefined;
      }

      return image;
    } else {
      const distro = platform.distros.find(distro => distro.id === distroId);
      if (!distro) {
        return undefined;
      }

      const image = distro.images.find(image => image.id === imageId);
      if (!image) {
        return undefined;
      }

      return image;
    }
  }
}

export class OperatingSystem {
  id: string;
  name: string;
  platforms: OperatingSystemPlatform[];

  constructor(id: string, name: string, platforms: OperatingSystemPlatform[] = []) {
    this.id = id;
    this.name = name;
    this.platforms = platforms;
  }

  getImage(id: string): OperatingSystemImage | undefined {
    for (const platform of this.platforms) {
      for (const distro of platform.distros) {
        for (const image of distro.images) {
          if (image.id === id) {
            return image;
          }
        }
      }
    }

    return undefined;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      platforms: [
        ${this.platforms.map(platform => platform.toString()).join(",\n")}
      ]
    }`;
  }

  static fromJson(json: string): OperatingSystem {
    const obj = JSON.parse(json);
    const platforms: OperatingSystemPlatform[] = [];
    for (const platform of obj.platforms ?? []) {
      platforms.push(OperatingSystemPlatform.fromJson(JSON.stringify(platform)));
    }
    return new OperatingSystem(obj.id, obj.name, platforms);
  }
}

export class OperatingSystemPlatform {
  id: string;
  name: string;
  distros: OperatingSystemPlatformDistros[];
  images: OperatingSystemImage[];

  constructor(
    id: string,
    name: string,
    distros: OperatingSystemPlatformDistros[] = [],
    images: OperatingSystemImage[] = []
  ) {
    this.id = id;
    this.name = name;
    this.distros = distros;
    this.images = images;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      distros: [
        ${this.distros.map(distro => distro.toString()).join(",\n")}
      ],
      images: [
        ${this.images.map(image => image.toString()).join(",\n")}
      ]
    }`;
  }

  static fromJson(json: string): OperatingSystemPlatform {
    const obj = JSON.parse(json);
    const distros: OperatingSystemPlatformDistros[] = [];
    for (const distro of obj.distros ?? []) {
      distros.push(OperatingSystemPlatformDistros.fromJson(JSON.stringify(distro)));
    }
    const images: OperatingSystemImage[] = [];
    for (const image of obj.images ?? []) {
      images.push(OperatingSystemImage.fromJson(JSON.stringify(image)));
    }
    return new OperatingSystemPlatform(obj.id, obj.name, distros, images);
  }
}

export class OperatingSystemPlatformDistros {
  id: string;
  name: string;
  images: OperatingSystemImage[];

  constructor(id: string, name: string, images: OperatingSystemImage[] = []) {
    this.id = id;
    this.name = name;
    this.images = images;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      images: [
        ${this.images.map(image => image.toString()).join(",\n")}
      ]
    }`;
  }

  static fromJson(json: string): OperatingSystemPlatformDistros {
    const obj = JSON.parse(json);
    const images: OperatingSystemImage[] = [];
    for (const image of obj.images ?? []) {
      images.push(OperatingSystemImage.fromJson(JSON.stringify(image)));
    }
    return new OperatingSystemPlatformDistros(obj.id, obj.name, images);
  }
}

export class OperatingSystemImage {
  id: string;
  name: string;
  type: "packer" | "iso" | "vagrant" | "internal" | "macos";
  distro: string;
  isoUrl: string;
  addons: OperatingSystemImageAddons[];
  bootCommand: string[];
  bootWait: string;
  shutdownCommand: string;
  shutdownTimeout: string;
  isoChecksum: string;
  httpContents: string[];

  constructor(
    id: string,
    name: string,
    distro = "",
    type: "packer" | "iso" | "vagrant" | "internal" | "macos" = "internal",
    isoUrl = "",
    addons: OperatingSystemImageAddons[] = [],
    bootCommand: string[] = [],
    bootWait = "10s",
    shutdownCommand = "echo 'vagrant'|sudo -S shutdown -P now",
    shutdownTimeout = "15m",
    isoChecksum = "",
    httpContents: string[] = []
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.isoUrl = isoUrl;
    this.addons = addons;
    this.bootCommand = bootCommand;
    this.bootWait = bootWait;
    this.shutdownCommand = shutdownCommand;
    this.shutdownTimeout = shutdownTimeout;
    this.isoChecksum = isoChecksum;
    this.distro = distro;
    this.httpContents = httpContents;
  }

  toString() {
    return `{
      id: '${this.id}',
      name: '${this.name}',
      distro: '${this.distro}',
      type: '${this.type}',
      isoUrl: '${this.isoUrl}',
      addons: [
        ${this.addons.map(addon => addon.toString()).join(",\n")}
      ]
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

    return new OperatingSystemImage(
      obj.id,
      obj.name,
      obj.distro,
      obj.type,
      obj.isoUrl,
      addons,
      bootCommand,
      obj.bootWait,
      obj.shutdownCommand,
      obj.shutdownTimeout,
      obj.isoChecksum,
      httpContents
    );
  }
}

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
