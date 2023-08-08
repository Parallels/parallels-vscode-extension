import * as vscode from "vscode";
import * as path from "path";
import { OperatingSystemPlatform } from "./OperatingSystemPlatform";
import { OperatingSystemImage } from "./OperatingSystemImage";

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
