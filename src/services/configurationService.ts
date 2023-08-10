import {FeatureFlags} from "./../models/FeatureFlags";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {FLAG_CONFIGURATION, FLAG_NO_GROUP, SettingsFlags} from "../constants/flags";
import {getUserProfileFolder} from "../helpers/helpers";
import {Provider, localStorage} from "../ioc/provider";
import {VirtualMachineGroup} from "../models/virtualMachineGroup";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {VirtualMachine} from "../models/virtualMachine";
import {HardwareInfo} from "../models/HardwareInfo";
import {HelperService} from "./helperService";
import {initialize} from "../initialization";
import {config} from "process";
import {LogService} from "./logService";
import {ParallelsDesktopServerInfo} from "../models/ParallelsDesktopServerInfo";

export class ConfigurationService {
  virtualMachinesGroups: VirtualMachineGroup[];
  featureFlags: FeatureFlags;
  hardwareInfo?: HardwareInfo;
  parallelsDesktopServerInfo?: ParallelsDesktopServerInfo;
  isInitialized = false;
  showHidden = false;
  showFlatSnapshotsList = false;
  locale = "en_US";

  constructor(private context: vscode.ExtensionContext) {
    this.virtualMachinesGroups = [];
    this.featureFlags = {
      enableTelemetry: undefined,
      hardwareId: undefined,
      platform: undefined,
      version: undefined,
      hardwareModel: undefined,
      serverVersion: undefined,
      osVersion: undefined
    };
    this.isInitialized = false;
  }

  get isDebugEnabled(): boolean {
    const debugEnvVariable = process.env.PARALLELS_DESKTOP_DEBUG;
    return debugEnvVariable !== undefined && debugEnvVariable.toLowerCase() === "true";
  }

  static fromJson(context: vscode.ExtensionContext, json: any): ConfigurationService {
    LogService.info("Loading configuration", "CoreService");
    try {
      const configuration = new ConfigurationService(context);
      json = JSON.parse(json);
      if (json.virtualMachinesGroup !== undefined) {
        json.virtualMachinesGroup.forEach((group: VirtualMachineGroup) => {
          const jsonGroup = JSON.stringify(group);
          const newGroup = VirtualMachineGroup.fromJson(jsonGroup);
          configuration.virtualMachinesGroups.push(newGroup);
        });
      }
      if (json.featureFlags !== undefined) {
        configuration.featureFlags = json.featureFlags;
      }

      return configuration;
    } catch (e) {
      LogService.error("Error loading configuration", "CoreService");
      throw e;
    }
  }

  async init(): Promise<void> {
    const promises: Promise<any>[] = [];

    promises.push(
      HelperService.getHardwareInfo().then(info => {
        this.hardwareInfo = info;
      }),
      ParallelsDesktopService.getServerInfo().then(info => {
        this.parallelsDesktopServerInfo = info;
      }),
      HelperService.getLocale().then(locale => {
        this.locale = locale.replace(/"/g, "").trim();
      })
    );

    await Promise.all(promises);
    LogService.info("Configuration Service initialized", "CoreService");
    this.isInitialized = true;
  }

  toJson(): any {
    const config = {
      virtualMachinesGroup: this.virtualMachinesGroups,
      featureFlags: this.featureFlags
    };

    return JSON.stringify(config, null, 2);
  }

  existsVirtualMachineGroup(name: string): boolean {
    return this.allGroups.some(
      group => group.name.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  getVirtualMachineGroup(name: string): VirtualMachineGroup | undefined {
    return this.allGroups.find(
      group => group.name.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  getVirtualMachine(nameOrId: string): VirtualMachine | undefined {
    return this.allMachines.find(
      machine =>
        machine.Name.toLowerCase() === nameOrId.toLowerCase() || machine.ID.toLowerCase() === nameOrId.toLowerCase()
    );
  }

  save() {
    const settings = Provider.getSettings();
    const configFolder = getUserProfileFolder();
    const userProfile = path.join(configFolder, "profile.json");
    fs.writeFileSync(userProfile, this.toJson());
  }

  addVirtualMachineGroup(group: VirtualMachineGroup) {
    if (!this.existsVirtualMachineGroup(group.name)) {
      if (group.parent !== undefined && group.parent !== "") {
        const parentGroup = this.getVirtualMachineGroup(group.parent);
        if (parentGroup) {
          parentGroup.addGroup(group);
        }
      } else {
        this.virtualMachinesGroups.push(group);
      }
      this.save();
    }
  }

  renameVirtualMachineGroup(nameOrId: string, newName: string) {
    const group = this.getVirtualMachineGroup(nameOrId);
    if (group) {
      group.name = newName;
      this.save();
    }
  }

  deleteVirtualMachineGroup(nameOrId: string) {
    const group = this.getVirtualMachineGroup(nameOrId);
    if (group) {
      if (group.parent === undefined || group.parent === "") {
        this.virtualMachinesGroups = this.virtualMachinesGroups.filter(
          group => group.name.toLowerCase() !== nameOrId.toLowerCase()
        );
        this.virtualMachinesGroups = this.virtualMachinesGroups.filter(
          group => group.uuid.toLowerCase() !== nameOrId.toLowerCase()
        );
      } else {
        const parentGroup = this.getVirtualMachineGroup(group.parent);
        if (parentGroup) {
          parentGroup.removeGroup(group.name);
        }
      }
      this.save();
    }
  }

  vmExistsInGroup(uuid: string): string | undefined {
    const groups = this.allGroups;
    for (const group of groups) {
      if (group?.existsVm(uuid)) {
        return group.name;
      }
    }

    return undefined;
  }

  moveGroupToGroup(groupName: string, destination: string) {
    const group = this.getVirtualMachineGroup(groupName);
    const destinationGroup = this.getVirtualMachineGroup(destination);
    if (group && destinationGroup) {
      this.deleteVirtualMachineGroup(groupName);
      if (destinationGroup.name === FLAG_NO_GROUP) {
        group.parent = undefined;
        this.virtualMachinesGroups.push(group);
      } else {
        group.parent = destination;
        destinationGroup.addGroup(group);
      }
      this.save();
    }
  }

  moveVmToGroup(vmNameOrId: string, destination: string) {
    const vm = this.getVirtualMachine(vmNameOrId);
    const destinationGroup = this.getVirtualMachineGroup(destination);
    if (vm && destinationGroup) {
      if (vm.group !== undefined && vm.group !== "") {
        const parentGroup = this.getVirtualMachineGroup(vm.group);
        if (parentGroup) {
          parentGroup.removeVm(vmNameOrId);
        }
      }
      destinationGroup.addVm(vm);
      this.save();
    }
  }

  hideVm(uuidOrName: string) {
    const vm = this.getVirtualMachine(uuidOrName);
    if (vm) {
      vm.hidden = true;
      this.save();
    }
  }

  showVm(uuidOrName: string) {
    const vm = this.getVirtualMachine(uuidOrName);
    if (vm) {
      vm.hidden = false;
      this.save();
    }
  }

  showVirtualMachineGroup(groupName: string) {
    const group = this.getVirtualMachineGroup(groupName);
    if (group) {
      group.hidden = false;
      this.save();
    }
  }

  hideVirtualMachineGroup(groupName: string) {
    const group = this.getVirtualMachineGroup(groupName);
    if (group) {
      group.hidden = true;
      this.save();
    }
  }

  clearVirtualMachineGroupsVms() {
    this.virtualMachinesGroups.forEach(group => group.clear());
    const configFolder = getUserProfileFolder();
    const userProfile = path.join(configFolder, "profile.json");
    fs.writeFileSync(userProfile, this.toJson());
  }

  setVmStatus(vmId: string, status: string) {
    const groupId = this.vmExistsInGroup(vmId);
    if (groupId) {
      const group = this.getVirtualMachineGroup(groupId);
      if (group) {
        group.machines.forEach(machine => {
          if (machine.ID === vmId) {
            machine.State = status;
          }
        });
      }
    }
  }

  get allGroups(): VirtualMachineGroup[] {
    const groups: VirtualMachineGroup[] = [];
    this.virtualMachinesGroups.forEach(group => {
      groups.push(group);
      groups.push(...group.getAllGroups());
    });

    return groups;
  }

  get allMachines(): VirtualMachine[] {
    const machines: VirtualMachine[] = [];
    const groups = this.allGroups;
    groups.forEach(group => {
      machines.push(...group.getAllVms());
    });

    return machines;
  }

  removeMachine(vmId: string) {
    const groupId = this.vmExistsInGroup(vmId);
    if (groupId) {
      const group = this.getVirtualMachineGroup(groupId);
      if (group) {
        group.removeVm(vmId);
      }
    }
  }

  sortGroups() {
    const settings = Provider.getSettings();
    if (settings.get<boolean>(SettingsFlags.orderTreeAlphabetically)) {
      const groups = this.allGroups;
      groups.forEach(group => {
        group.sortGroups();
      });
    }
  }

  sortVms() {
    const settings = Provider.getSettings();
    if (settings.get<boolean>(SettingsFlags.orderTreeAlphabetically)) {
      const groups = this.allGroups;
      groups.forEach(group => {
        group.sortVms();
      });
    }
  }

  sort() {
    this.sortGroups();
    this.sortVms();
  }

  get parallelsCEPStatus(): boolean {
    return this.parallelsDesktopServerInfo?.["CEP mechanism"] === "on" ? true : false;
  }

  get isTelemetryEnabled(): boolean | undefined {
    if (this.featureFlags.enableTelemetry === undefined) {
      if (this.parallelsCEPStatus) {
        this.featureFlags.enableTelemetry = true;
        this.save();
        return true;
      } else {
        return undefined;
      }
    }

    return this.featureFlags.enableTelemetry;
  }

  get parallelsDesktopVersion(): string {
    const version = this.parallelsDesktopServerInfo?.["Version"].replace("Desktop ", "");
    return version ? version : "";
  }

  get osVersion(): string {
    const osVersion = this.parallelsDesktopServerInfo?.["OS"].replace("macOS ", "").split("(")[0];
    return osVersion ? osVersion : "";
  }

  get hardwareModel(): string {
    const model = this.hardwareInfo?.SPHardwareDataType[0].machine_model;
    return model ? model : "";
  }

  get hardwareId(): string {
    const hardwareId = `${this.hardwareInfo?.SPHardwareDataType[0].platform_UUID}`;
    return hardwareId ? hardwareId : "";
  }

  get architecture(): string {
    const chip = this.hardwareInfo?.SPHardwareDataType[0].chip_type ?? "unknown";
    if (chip.indexOf("Apple") >= 0) {
      return "arm64";
    } else {
      return "x86_64";
    }
  }

  get packerDesktopMajorVersion(): number {
    const version = this.parallelsDesktopVersion;
    if (version) {
      return parseInt(version.split(".")[0]);
    }
    return 0;
  }

  get vmHome(): string {
    const home = this.parallelsDesktopServerInfo?.["VM home"].replace(/\\/g, "") ?? "";
    return home;
  }
}
