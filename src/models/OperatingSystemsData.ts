import * as vscode from "vscode";
import * as path from "path";
import {PackerService} from "../services/packerService";
import {OperatingSystemImage} from "./OperatingSystemImage";
import {OperatingSystem} from "./operatingSystem";
import {LogService} from "../services/logService";
import {Provider} from "../ioc/provider";

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
          const config = Provider.getConfiguration();
          if (!config.tools.packer.isInstalled) {
            // Filter out packer images if packer is not installed
            this.operatingSystems.forEach(os => {
              os.platforms.forEach(platform => {
                platform.images = platform.images.filter(image => image.type !== "packer");
                platform.distros.forEach(distro => {
                  distro.images = distro.images.filter(image => image.type !== "packer");
                });
                platform.distros = platform.distros.filter(distro => distro.images.length > 0);
              });
              os.platforms = os.platforms.filter(platform => platform.images.length > 0 || platform.distros.length > 0);
            });
            this.operatingSystems = this.operatingSystems.filter(os => os.platforms.length > 0);
          }

          // Adding the startHeadless flag to linux and windows machines
          this.addStartHeadlessFlag();

          // Adding the generateVagrantBox if vagrant is enabled
          this.addGenerateVagrantBoxFlag();

          // Adding the enableRosetta flag to macos machines
          this.addEnableRosettaFlag();

          LogService.info("Operating systems loaded", "OperatingSystemsData");
          resolve(this.operatingSystems);
        })
        .catch(reject);
    });
  }

  private addGenerateVagrantBoxFlag() {
    const config = Provider.getConfiguration();
    if (config.tools.vagrant.isInstalled) {
      this.operatingSystems.forEach(os => {
        os.platforms.forEach(platform => {
          platform.images.forEach(image => {
            if (image.type === "packer") {
              image.allowedFlags.push({code: "generateVagrantBox", name: "Generate Vagrant Box", enabled: false});
            }
          });
          platform.distros.forEach(distro => {
            distro.images.forEach(image => {
              if (image.type === "packer") {
                image.allowedFlags.push({code: "generateVagrantBox", name: "Generate Vagrant Box", enabled: false});
              }
            });
          });
        });
      });
    }
  }

  private addStartHeadlessFlag() {
    this.operatingSystems.forEach(os => {
      if (os.id === "linux" || os.id === "windows") {
        os.platforms.forEach(platform => {
          platform.images.forEach(image => {
            image.allowedFlags.push({code: "startHeadless", name: "Start Machine in Headless Mode", enabled: false});
          });
          platform.distros.forEach(distro => {
            distro.images.forEach(image => {
              image.allowedFlags.push({code: "startHeadless", name: "Start Machine in Headless Mode", enabled: false});
            });
          });
        });
      }
    });
  }

  private addEnableRosettaFlag() {
    this.operatingSystems.forEach(os => {
      if (os.id === "linux") {
        os.platforms.forEach(platform => {
          platform.images.forEach(image => {
            image.allowedFlags.push({code: "enableRosetta", name: "Use Rosetta to run x86 binaries", enabled: false});
          });
          platform.distros.forEach(distro => {
            distro.images.forEach(image => {
              image.allowedFlags.push({code: "enableRosetta", name: "Use Rosetta to run x86 binaries", enabled: false});
            });
          });
        });
      }
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
