import * as vscode from "vscode";
import * as path from "path";
import {PackerService} from "../services/packerService";
import {OperatingSystemImage} from "./OperatingSystemImage";
import { OperatingSystem } from "./operatingSystem";

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

      if (image.type === "packer") {
        if (!image.addons || image.addons.length == 0) {
          PackerService.getAvailableAddonsForMachine(distro.name).then(addons => {
            for (const addon of addons) {
              image.addons.push({
                id: addon.code,
                name: addon.name,
                deploy: false
              });
            }
          });
        }
      }
      return image;
    }
  }
}
