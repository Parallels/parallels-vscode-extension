import * as vscode from "vscode";
import * as path from "path";
import {PackerService} from "../services/packerService";
import {OperatingSystemImage} from "./OperatingSystemImage";
import {OperatingSystem} from "./operatingSystem";
import {LogService} from "../services/logService";

export class OperatingSystemsData {
  operatingSystems: OperatingSystem[];

  constructor(private context: vscode.ExtensionContext) {
    this.operatingSystems = [];
  }

  get(): Promise<OperatingSystem[]> {
    return new Promise<OperatingSystem[]>(async (resolve, reject) => {
      const dataPath = path.join(this.context.extensionPath, "data");
      const osFileName = vscode.Uri.file(path.join(dataPath, "os.json"));
      LogService.info(`Loading operating systems from ${osFileName.fsPath}`, "OperatingSystemsData");
      const file = await vscode.workspace.fs.readFile(osFileName);
      const jsonObj = JSON.parse(file.toString());
      jsonObj.forEach((os: any) => {
        this.operatingSystems.push(OperatingSystem.fromJson(JSON.stringify(os)));
      });

      const promises = this.operatingSystems.flatMap(os => {
        return os.platforms
          .flatMap(platform => {
            return platform.images.flatMap(async image => {
              if (image.allowAddons) {
                const addons = (await PackerService.getPlatformAddons(image.packerFolder ?? image.distro)).map(
                  addon => {
                    return {
                      id: addon.code,
                      name: addon.name,
                      deploy: false
                    };
                  }
                );
                image.addons = addons;
              }
            });
          })
          .concat(
            os.platforms.flatMap(platform => {
              return platform.distros.flatMap(distro => {
                return distro.images.flatMap(async image => {
                  if (image.allowAddons) {
                    image.addons = (await PackerService.getPlatformAddons(image.packerFolder ?? image.distro)).map(
                      addon => {
                        return {
                          id: addon.code,
                          name: addon.name,
                          deploy: false
                        };
                      }
                    );
                  }
                });
              });
            })
          );
      });

      Promise.all(promises)
        .then(() => {
          LogService.info("Operating systems loaded", "OperatingSystemsData");
          resolve(this.operatingSystems);
        })
        .catch(reject);
    });
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
