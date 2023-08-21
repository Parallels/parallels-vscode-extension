import * as vscode from "vscode";
import {OperatingSystem} from "../models/operatingSystem";
import * as path from "path";
import * as fs from "fs";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {getDownloadFolder, getPackerTemplateFolder, getVagrantBoxFolder} from "../helpers/helpers";
import {CommandsFlags, getVmType} from "../constants/flags";
import {PackerService} from "./packerService";
import {VagrantService} from "./vagrantService";
import {OperatingSystemsData} from "../models/OperatingSystemsData";
import {OperatingSystemImage} from "../models/OperatingSystemImage";
import {NewVirtualMachineRequest} from "../models/NewVirtualMachineRequest";
import {NewVirtualMachineSpecs} from "../models/NewVirtualMachineSpecs";
import {HelperService} from "./helperService";
import {PackerVirtualMachineConfig} from "../models/PackerVirtualMachineConfig";
import {Provider} from "../ioc/provider";
import {LogService} from "./logService";

export class CreateMachineService {
  constructor(private context: vscode.ExtensionContext) {}

  get(): Promise<OperatingSystem[]> {
    return new Promise<OperatingSystem[]>(async (resolve, reject) => {
      const data = new OperatingSystemsData(this.context);
      await data.get();

      return resolve(data.operatingSystems);
    });
  }

  /**
   * Creates a new virtual machine based on the provided request.
   * @param request - The request object containing the necessary information to create the virtual machine.
   * @returns A Promise that resolves to a boolean indicating whether the virtual machine was successfully created.
   * @throws An error if there was an issue creating the virtual machine.
   */
  async createVm(request: NewVirtualMachineRequest): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        LogService.info(`Creating VM ${request.name}`, "CreateMachineService");
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
      } catch (error) {
        return reject(error);
      }
    });
  }

  private createLinux(osData: OperatingSystemsData, request: NewVirtualMachineRequest): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const img = osData.getImage(request.os, request.platform, request.distro, request.image);

      if (!img) {
        return reject("Image not found");
      }
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

      switch (img.type) {
        case "macos":
          this.createMacvm(osData, request, img)
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

  private createMacvm(
    osData: OperatingSystemsData,
    request: NewVirtualMachineRequest,
    img: OperatingSystemImage
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const filePath = path.join(getDownloadFolder(), `${request.name}.ipsw`);
      if (!fs.existsSync(filePath)) {
        await HelperService.downloadFile(this.context, img.name, request.name, img.isoUrl, filePath)
          .then(result => {
            if (!result) {
              return reject("Error downloading image");
            }
          })
          .catch(reason => {
            return reject(reason);
          });
      } else {
        LogService.info(`Image already downloaded to ${filePath}`, "CreateMachineService");
      }

      await ParallelsDesktopService.createMacVm(filePath, request.name)
        .then(value => {
          if (!value) {
            return reject("Error creating VM");
          }
          LogService.info(`VM ${request.name} created`, "CreateMachineService");
          return resolve(true);
        })
        .catch(reason => {
          LogService.error(`There was an error creating the machine ${request.name}`, "CreateMachineService");
          return reject(reason);
        });
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
      const config = Provider.getConfiguration();
      const existsVMName = config.allMachines.filter(m => m.Name.toLowerCase() === request.name.toLowerCase());
      if (existsVMName.length > 0) {
        LogService.error(`Machine ${request.name} already exists`, "CreateMachineService");
        return reject(`Machine ${request.name} already exists`);
      }

      let isoUri = request.isoUrl ?? img.isoUrl ?? "";
      const isoChecksum = request.isoChecksum ?? img.isoChecksum ?? "";

      if (!isoUri) {
        LogService.error("No ISO URL provided");
        return reject("No ISO URL provided");
      }
      if (!isoChecksum) {
        LogService.error("No ISO checksum provided");
        return reject("No ISO checksum provided");
      }

      if (isoUri.startsWith("http")) {
        const isoName = `${request.name}.iso`;
        let isoUrlFilename = isoUri.substring(isoUri.lastIndexOf("/") + 1);
        if (isoUrlFilename.indexOf(".iso") === -1) {
          isoUrlFilename = isoName;
        }
        const filePath = path.join(getDownloadFolder(), isoUrlFilename);
        if (!fs.existsSync(filePath)) {
          const isDownloaded = await HelperService.downloadFile(
            this.context,
            request.name,
            request.name,
            isoUri,
            filePath
          ).catch(reason => {
            return reject(reason);
          });
          if (!isDownloaded) {
            LogService.error("Error downloading image");
            return reject("Error downloading image");
          }
        } else {
          LogService.info(`Iso already downloaded to ${filePath}`);
        }
        isoUri = filePath;
      } else {
        if (!fs.existsSync(isoUri)) {
          LogService.error(`ISO file not found on ${isoUri}`);
          return reject(`ISO file not found on ${isoUri}`);
        }
      }
      const checksum = isoChecksum.split(":")[1];
      const checksumType = isoChecksum.split(":")[0];
      if (!checksum || !checksumType) {
        LogService.error("Checksum not valid");
        return reject("Checksum not valid");
      }
      const isChecksumValid = await HelperService.checkFileChecksum(isoUri, checksum, checksumType);
      if (!isChecksumValid) {
        LogService.error("Checksum failed");
        return reject("Checksum failed");
      }
      LogService.info("Checksum OK", "CreateMachineService");
      const specs: NewVirtualMachineSpecs = request.specs ?? {
        cpus: 2,
        memory: 2048,
        disk: "51200",
        username: "parallels",
        password: "parallels"
      };

      ParallelsDesktopService.createIsoVm(request.name, isoUri, getVmType(img.distro), specs)
        .then(
          async value => {
            if (!value) {
              return reject("Error creating VM");
            }
            if (request.flags) {
              request.flags.forEach(async flag => {
                if (flag.code === "startHeadless" && flag.enabled) {
                  await ParallelsDesktopService.setVmConfig(request.name, "startup-view", "headless");
                }
                if (flag.code === "enableRosetta" && flag.enabled) {
                  await ParallelsDesktopService.setVmConfig(request.name, "rosetta-linux", "on");
                }
              });
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
    img: OperatingSystemImage
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      if (request.os === "windows") {
        request.distro = "win-11";
      }

      try {
        const config = Provider.getConfiguration();
        const packerSvc = new PackerService(this.context);

        // Setting the packer machine folder
        const outputFolder = `${config.vmHome}/${request.name}`;
        if (fs.existsSync(outputFolder)) {
          LogService.error(`Machine ${request.name} already exists`, "CreateMachineService");
          const files = fs.readdirSync(outputFolder);
          if (files.length > 0) {
            return reject(
              `Machine ${request.name} packer output folder ${outputFolder} already exists and contains files, please remove it and try again`
            );
          } else {
            fs.rmdirSync(outputFolder, {recursive: true});
          }
        }

        const machineConfig: PackerVirtualMachineConfig = {
          id: img.id,
          base: request.os,
          platform: request.platform,
          distro: img.distro,
          name: request.name,
          isoChecksum: request.isoChecksum ?? img.isoChecksum,
          isoUrl: request.isoUrl ?? img.isoUrl,
          generateVagrantBox: false,
          outputFolder: outputFolder,
          packerScriptFolder: path.join(getPackerTemplateFolder(), img.packerFolder),
          variables: img.variables ?? {},
          addons: request.addons ?? [],
          specs: {
            cpus: request.specs?.cpus ?? img.defaults?.specs?.cpus ?? 2,
            memory: request.specs?.memory ?? img.defaults?.specs?.memory ?? 2048,
            disk: request.specs?.disk ?? img.defaults?.specs?.diskSize ?? "40000"
          },
          forceBuild: false
        };

        if (request.flags) {
          request.flags.forEach(flag => {
            if (flag.code === "generateVagrantBox" && flag.enabled) {
              machineConfig.generateVagrantBox = true;
            }
          });
        }

        if (machineConfig.name) {
          machineConfig.variables["machine_name"] = request.name;
        }
        if (machineConfig.isoChecksum) {
          machineConfig.variables[machineConfig.base === "macos" ? "ipsw_checksum" : "iso_checksum"] =
            machineConfig.isoChecksum;
        }
        if (machineConfig.isoUrl) {
          machineConfig.variables[machineConfig.base === "macos" ? "ipsw_url" : "iso_url"] = machineConfig.isoUrl;
        }
        if (machineConfig.generateVagrantBox) {
          machineConfig.variables["create_vagrant_box"] = machineConfig.generateVagrantBox;
          machineConfig.variables["output_vagrant_directory"] = getVagrantBoxFolder();
        }
        if (machineConfig.addons && machineConfig.addons.length > 0) {
          machineConfig.variables["addons"] = machineConfig.addons;
        }
        if (machineConfig.specs) {
          if (machineConfig.base === "macos") {
            machineConfig.variables["machine_specs"] = {
              cpus: machineConfig.specs.cpus ?? 2,
              memory: machineConfig.specs.memory ?? 2048
            };
          } else {
            machineConfig.variables["machine_specs"] = {
              cpus: machineConfig.specs.cpus ?? 2,
              memory: machineConfig.specs.memory ?? 2048,
              disk_size: machineConfig.specs.disk ?? "40000"
            };
          }
        }
        if (machineConfig.outputFolder) {
          machineConfig.variables["output_directory"] = machineConfig.outputFolder;
        }

        packerSvc
          .buildVm(machineConfig)
          .then(
            value => {
              if (!value) {
                return reject("Error generating packer file");
              }
              // Registering our new VM if we are not generating a Vagrant box
              if (!machineConfig.generateVagrantBox) {
                // Moving the VM from the packer folder to the VMs folder
                const originalVmFile = `${machineConfig.outputFolder}/${request.name}.${
                  machineConfig.base === "macos" ? "macvm" : "pvm"
                }`;
                const newVmFile = `${config.vmHome}/${request.name}.${
                  machineConfig.base === "macos" ? "macvm" : "pvm"
                }`;
                // Moving the vm to the right folder
                if (fs.existsSync(originalVmFile)) {
                  fs.renameSync(originalVmFile, newVmFile);
                }
                // Removing the output folder
                if (fs.existsSync(machineConfig.outputFolder)) {
                  fs.rmSync(machineConfig.outputFolder, {recursive: true});
                }
                if (!fs.existsSync(newVmFile)) {
                  return reject("Error moving VM");
                }

                ParallelsDesktopService.registerVm(newVmFile)
                  .then(value => {
                    if (!value) {
                      return reject("Error registering VM");
                    }
                    if (request.flags) {
                      request.flags.forEach(async flag => {
                        if (flag.code === "startHeadless" && flag.enabled) {
                          await ParallelsDesktopService.setVmConfig(request.name, "startup-view", "headless");
                        }
                        if (flag.code === "enableRosetta" && flag.enabled) {
                          await ParallelsDesktopService.setVmConfig(request.name, "rosetta-linux", "on");
                          if (machineConfig.distro === "ubuntu") {
                            await ParallelsDesktopService.startVm(request.name);
                            await ParallelsDesktopService.executeOnVm(
                              request.name,
                              `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Parallels/packer-examples/main/scripts/ubuntu/base/rosetta_x86_sources.sh)"`
                            );
                            await ParallelsDesktopService.stopVm(request.name);
                          }
                        }
                      });
                    }
                    return resolve(value);
                  })
                  .catch(reason => {
                    return reject(reason);
                  });
              } else {
                const outputFolder = path.join(getVagrantBoxFolder(), "box");
                const boxPath = path.join(outputFolder, machineConfig.name + ".box");
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
