import {PackerVirtualMachineSpecs} from "./../models/packerVirtualMachineSpecs";
import * as vscode from "vscode";
import {OperatingSystem, OperatingSystemImage, OperatingSystemsData} from "../models/operatingSystem";
import * as path from "path";
import {NewVirtualMachineRequest as NewVirtualMachineRequest} from "../models/newVmRequest";
import axios from "axios";
import * as fs from "fs";
import {parallelsOutputChannel} from "../helpers/channel";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {getDownloadFolder, getPackerFilesFolder} from "../helpers/helpers";
import {CommandsFlags, getVmType} from "../constants/flags";
import {PackerService} from "./packerService";
import {VagrantService} from "./vagrantService";

export class CreateMachineService {
  constructor(private context: vscode.ExtensionContext) {}

  get(): Promise<OperatingSystem[]> {
    return new Promise<OperatingSystem[]>(async (resolve, reject) => {
      const data = new OperatingSystemsData(this.context);
      await data.get();

      return resolve(data.operatingSystems);
    });
  }

  async createVm(request: NewVirtualMachineRequest): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      parallelsOutputChannel.appendLine(`Creating VM ${request.name}`);
      const data = new OperatingSystemsData(this.context);
      await data.get();
      switch (request.os) {
        case "linux":
          this.createLinux(data, request)
            .then(
              value => {
                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "windows":
          this.createWindows(data, request)
            .then(
              value => {
                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "macos":
          this.createMacOs(data, request)
            .then(
              value => {
                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
      }
    });
  }

  private createLinux(osData: OperatingSystemsData, request: NewVirtualMachineRequest): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const img = osData.getImage(request.os, request.platform, request.distro, request.image);

      if (!img) {
        return reject("Image not found");
      }

      parallelsOutputChannel.appendLine(`Image found: ${img.name}`);
      switch (img.type) {
        case "iso":
          this.createIso(osData, request, img)
            .then(
              value => {
                if (!value) {
                  return reject("Error creating VM");
                }

                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "packer":
          this.createPacker(osData, request, img)
            .then(
              value => {
                if (!value) {
                  return reject("Error creating VM");
                }

                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "vagrant":
          this.createPacker(osData, request, img)
            .then(
              value => {
                if (!value) {
                  return reject("Error creating VM");
                }

                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "internal":
          return resolve(true);
      }
    });
  }

  private createWindows(osData: OperatingSystemsData, request: NewVirtualMachineRequest): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const img = osData.getImage(request.os, request.platform, request.distro, request.image);
      if (!img) {
        return reject("Image not found");
      }
      parallelsOutputChannel.appendLine(`Image found: ${img.name}`);
      switch (img.type) {
        case "iso":
          this.createIso(osData, request, img)
            .then(
              value => {
                if (!value) {
                  return reject("Error creating VM");
                }

                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "packer":
          this.createPacker(osData, request, img)
            .then(
              value => {
                if (!value) {
                  return reject("Error creating VM");
                }

                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "vagrant":
          this.createPacker(osData, request, img)
            .then(
              value => {
                if (!value) {
                  return reject("Error creating VM");
                }

                return resolve(value);
              },
              reason => {
                return reject(reason);
              }
            )
            .catch(reason => {
              return reject(reason);
            });
          break;
        case "internal":
          return resolve(true);
      }
    });
  }

  private createMacOs(osData: OperatingSystemsData, request: NewVirtualMachineRequest): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const img = osData.getImage(request.os, request.platform, request.distro, request.image);
      if (!img) {
        return reject("Image not found");
      }

      parallelsOutputChannel.appendLine(`Image found: ${img.name}`);

      const filePath = path.join(getDownloadFolder(this.context), `${request.name}.ipsw`);
      if (!fs.existsSync(filePath)) {
        await this.downloadFile(img.name, request.name, img.isoUrl, filePath)
          .then(result => {
            if (!result) {
              return reject("Error downloading image");
            }
          })
          .catch(reason => {
            return reject(reason);
          });
      } else {
        parallelsOutputChannel.appendLine(`Image already downloaded to ${filePath}`);
      }

      await ParallelsDesktopService.createMacVm(filePath, request.name)
        .then(value => {
          if (!value) {
            return reject("Error creating VM");
          }
          parallelsOutputChannel.appendLine(`VM ${request.name} created`);
          return resolve(true);
        })
        .catch(reason => {
          parallelsOutputChannel.appendLine(`There was an error creating the machine ${request.name}`);
          return reject(reason);
        });
    });
  }

  private async downloadFile(name: string, fileName: string, url: string, filePath: string): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      parallelsOutputChannel.appendLine(`Downloading image from ${url}`);
      const response = await axios.get(url, {
        responseType: "stream"
      });
      const totalLength = response.headers["content-length"];
      let downloaded = 0;
      const writer = fs.createWriteStream(filePath);
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Downloading image for ${name}`
        },
        async progress => {
          return new Promise<boolean>((resolve, reject) => {
            response.data.on("data", (chunk: any) => {
              downloaded += chunk.length;
              const percent = Math.round((100 * downloaded) / totalLength);
              progress.report({message: `${percent}%`});
            });
            writer.on("finish", () => {
              parallelsOutputChannel.appendLine(
                `Image downloaded to ${path.join(this.context.extensionPath, filePath)}`
              );
              return resolve(true);
            });
            response.data.on("error", (err: any) => {
              return reject(err);
            });
          })
            .then(result => {
              return resolve(result);
            })
            .catch(reason => {
              return reject(reason);
            });
        }
      );
      response.data.pipe(writer);
    });
  }

  private createIso(
    osData: OperatingSystemsData,
    request: NewVirtualMachineRequest,
    img: OperatingSystemImage
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      if (request.os === "windows") {
        request.distro = "win-11";
      }

      parallelsOutputChannel.appendLine(`Image found: ${img.name}`);
      const isoName = `${request.name}.iso`;
      const filePath = path.join(getDownloadFolder(this.context), isoName);
      if (!fs.existsSync(filePath)) {
        const isDownloaded = await this.downloadFile(img.name, request.name, img.isoUrl, filePath).catch(reason => {
          return reject(reason);
        });
        if (!isDownloaded) {
          return reject("Error downloading image");
        }
      } else {
        parallelsOutputChannel.appendLine(`Image already downloaded to ${filePath}`);
      }

      ParallelsDesktopService.createIsoVm(request.name, filePath, getVmType(img.distro), request.specs)
        .then(
          value => {
            if (!value) {
              return reject("Error creating VM");
            }
            return resolve(value);
          },
          reason => {
            return reject(reason);
          }
        )
        .catch(reason => {
          return reject(reason);
        });
    });
  }

  private createPacker(
    osData: OperatingSystemsData,
    request: NewVirtualMachineRequest,
    img: OperatingSystemImage,
    generateVagrantBox = false
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      if (request.os === "windows") {
        request.distro = "win-11";
      }
      try {
        const packerSvc = new PackerService(this.context);

        // creating the folder for the packer files
        const packerFolder = path.join(getPackerFilesFolder(this.context), img.name.replace(/\s/g, "_"));
        if (!fs.existsSync(packerFolder)) {
          fs.mkdirSync(packerFolder);
        }
        
        const specs: PackerVirtualMachineSpecs = {
          imgId: img.id,
          folder: packerFolder,
          generateVagrantBox: request.flags.generateVagrantBox,
          distro: img.distro,
          toolsFlavor: PackerService.getToolsFlavor(request.os, request.platform),
          bootCommand: img.bootCommand,
          bootWait: img.bootWait ? img.bootWait : "10s",
          cpus: Number.parseInt(request.specs.cpus),
          memory: Number.parseInt(request.specs.memory),
          diskSize: Number.parseInt(request.specs.disk),
          isoChecksum: img.isoChecksum,
          isoUrl: img.isoUrl,
          vmName: request.name,
          shutdownTimeout: img.shutdownTimeout ? img.shutdownTimeout : "10m",
          shutdownCommand: img.shutdownCommand ? img.shutdownCommand : "sudo -S shutdown -P now",
          sshPort: 22,
          sshUsername: request.specs.username == "undefined" ? request.distro : request.specs.username,
          sshEncryptedPassword:
            "$6$puLhc5BIC.nOFJMh$MENWZR.4Q0XAeMJcaWlLp2nGnMHx0tn1AQZZqR1M9mwGCJ6vUuTXvTryC8OyUvPzfObyPuUp/zcI1J/h3vJtP1",
          sshPassword: "parallels",
          sshWaitTimeout: "10000s",
          sshTimeout: "60m",
          addons: request.addons,
          base: request.os,
          guestOs: request.os,
          name: request.name,
          user: request.specs.username == "undefined" ? request.distro : request.specs.username,
          password: "parallels",
          platform: request.platform,
          outputFolder: `${packerFolder}/output`,
          httpContents: img.httpContents
        };

        if (request.flags.generateVagrantBox) {
          specs.sshUsername = "vagrant";
          specs.sshPassword = "vagrant";
          specs.sshEncryptedPassword =
            "$6$rounds=4096$5CU3LEj/MQvbkfPb$LmKEF9pCfU8R.dA.GemgE/8GT6r9blge3grJvdsVTMFKyLEQwzEF3SGWqAzjawY/XHRpWj4fOiLBrRyxJhIRJ1";
          specs.password = "vagrant";
          specs.user = "vagrant";
        }

        packerSvc
          .buildVm(specs)
          .then(
            value => {
              if (!value) {
                return reject("Error generating packer file");
              }
              // Registering our new VM if we are not generating a Vagrant box
              if (!specs.generateVagrantBox) {
                ParallelsDesktopService.registerVm(`${specs.outputFolder}/${request.name}.pvm`)
                  .then(value => {
                    if (!value) {
                      return reject("Error registering VM");
                    }
                    return resolve(value);
                  })
                  .catch(reason => {
                    return reject(reason);
                  });
              } else {
                const outputFolder = specs.outputFolder.replace("output", "box");
                const boxName = `parallels_${specs.vmName.replace(/\s/g, "_").toLowerCase()}.box`;
                const boxPath = path.join(outputFolder, boxName);
                if (!fs.existsSync(boxPath)) {
                  return reject("Error generating Vagrant box");
                }

                VagrantService.add(request.name, boxPath)
                  .then(
                    value => {
                      if (!value) {
                        return reject("Error adding Vagrant box");
                      }

                      if (fs.existsSync(outputFolder)) {
                        fs.rmSync(outputFolder, {recursive: true});
                      }

                      vscode.commands.executeCommand(CommandsFlags.vagrantBoxProviderRefresh);
                      return resolve(value);
                    },
                    reason => {
                      return reject(reason);
                    }
                  )
                  .catch(reason => {
                    return reject(reason);
                  });
              }
            },
            reason => {
              return reject(reason);
            }
          )
          .catch(reason => {
            return reject(reason);
          });
      } catch (reason) {
        return reject(reason);
      }
    });
  }
}
