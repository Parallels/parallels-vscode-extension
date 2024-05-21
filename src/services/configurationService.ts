import {configurationInitialized} from "./../ioc/provider";
import {FeatureFlags} from "./../models/FeatureFlags";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  CommandsFlags,
  FLAG_DEVOPS_SERVICE_EXISTS,
  FLAG_DOCKER_CONTAINER_ITEMS_EXISTS,
  FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY,
  FLAG_HAS_VAGRANT_BOXES,
  FLAG_HAS_VIRTUAL_MACHINES,
  FLAG_NO_GROUP,
  FLAG_PACKER_EXISTS,
  FLAG_PARALLELS_DESKTOP_EXISTS,
  FLAG_VAGRANT_EXISTS
} from "../constants/flags";
import {getUserProfileFolder} from "../helpers/helpers";
import {Provider} from "../ioc/provider";
import {VirtualMachineGroup} from "../models/parallels/virtualMachineGroup";
import {ParallelsDesktopService} from "./parallelsDesktopService";
import {VirtualMachine} from "../models/parallels/virtualMachine";
import {HardwareInfo} from "../models/parallels/HardwareInfo";
import {HelperService} from "./helperService";
import {LogService} from "./logService";
import {ParallelsDesktopServerInfo} from "../models/parallels/ParallelsDesktopServerInfo";
import {Tools} from "../models/tools";
import {BrewService} from "./brewService";
import {GitService} from "./gitService";
import {PackerService} from "./packerService";
import {VagrantService} from "./vagrantService";
import {DockerRunItem} from "../models/docker/dockerRunItem";
import {DevOpsService} from "./devopsService";
import {DevOpsCatalogHostProvider} from "../models/devops/catalogHostProvider";
import {CatalogManifest, CatalogManifestItem} from "../models/devops/catalogManifest";
import {parseHost} from "../models/host";
import {DevOpsRemoteHostProvider} from "../models/devops/remoteHostProvider";
import {DevOpsRemoteHost} from "../models/devops/remoteHost";

export class ConfigurationService {
  virtualMachinesGroups: VirtualMachineGroup[];
  catalogProviders: DevOpsCatalogHostProvider[];
  remoteHostProviders: DevOpsRemoteHostProvider[];
  featureFlags: FeatureFlags;
  tools: Tools;
  hardwareInfo?: HardwareInfo;
  parallelsDesktopServerInfo?: ParallelsDesktopServerInfo;
  isInitialized = false;
  showHidden = false;
  showFlatSnapshotsList = false;
  locale = "en_US";
  packerTemplatesCloned = false;
  dockerRunItems: DockerRunItem[] = [];
  lastSynced: number | undefined;
  lastHeartbeat: number | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.virtualMachinesGroups = [];
    this.dockerRunItems = [];
    this.catalogProviders = [];
    this.remoteHostProviders = [];
    this.featureFlags = {
      enableTelemetry: undefined,
      hardwareId: undefined,
      platform: undefined,
      version: undefined,
      hardwareModel: undefined,
      serverVersion: undefined,
      osVersion: undefined
    };
    this.tools = {
      brew: {
        name: "brew",
        version: "",
        isInstalled: false,
        isReady: false
      },
      git: {
        name: "git",
        version: "",
        isInstalled: false,
        isReady: false
      },
      packer: {
        name: "packer",
        version: "",
        isInstalled: false,
        isReady: false
      },
      vagrant: {
        name: "vagrant",
        version: "",
        isInstalled: false,
        isReady: false
      },
      parallelsDesktop: {
        name: "prlctl",
        version: "",
        isInstalled: false,
        isReady: false
      },
      devopsService: {
        name: "prldevops",
        version: "",
        isInstalled: false,
        isReady: false
      }
    };
    this.lastSynced = undefined;
    this.lastHeartbeat = undefined;
    this.isInitialized = false;
    this.backup();
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
      if (json.tools !== undefined) {
        configuration.tools = json.tools;
      }
      if (json.hardwareInfo !== undefined) {
        configuration.hardwareInfo = json.hardwareInfo;
      }
      if (json.parallelsDesktopServerInfo !== undefined) {
        configuration.parallelsDesktopServerInfo = json.parallelsDesktopServerInfo;
      }
      if (json.locale !== undefined) {
        configuration.locale = json.locale;
      }
      if (json.lastSynced !== undefined) {
        configuration.lastSynced = json.lastSynced;
      }
      if (json.lastHeartbeat !== undefined) {
        configuration.lastHeartbeat = json.lastHeartbeat;
      }
      if (json.devops !== undefined) {
        configuration.dockerRunItems = json.dockerRunItems;
      }
      if (json.catalogProviders !== undefined) {
        configuration.catalogProviders = json.catalogProviders;
      }
      if (json.remoteHostProviders !== undefined) {
        configuration.remoteHostProviders = json.remoteHostProviders;
      }

      return configuration;
    } catch (e) {
      LogService.error("Error loading configuration", "CoreService");
      throw e;
    }
  }

  async init(): Promise<void> {
    const promises: Promise<any>[] = [];
    // We will have two ways of configuring the extension, this first run if we do not have a configuration file
    // they we will wait to populate everything, otherwise we will just load the configuration file and start a background
    // task to update the configuration

    const os = Provider.getOs();
    promises.push(this.initDevOpsService());

    // This is only available on macOS
    if (os === "darwin") {
      promises.push(
        this.initBrew(),
        this.initGit(),
        this.initParallelsDesktop(),
        this.initPacker(),
        this.initVagrant(),
        this.loadDockerRunItems(),
        HelperService.getHardwareInfo().then(info => {
          this.hardwareInfo = info;
        }),
        HelperService.getLocale().then(locale => {
          this.locale = locale.replace(/"/g, "").trim();
        })
      );
    }

    if (
      this.lastSynced === undefined ||
      this.hardwareInfo === undefined ||
      this.parallelsDesktopServerInfo === undefined ||
      this.locale === undefined
    ) {
      LogService.info("Waiting for configuration to be initialized", "CoreService");
      await Promise.all(promises);
      LogService.info("Configuration Service initialized", "CoreService");
      this.lastSynced = Date.now();
      this.isInitialized = true;
      this.save();
    } else {
      LogService.info("Configuration Service initialized", "CoreService");
      Promise.all(promises).then(() => {
        LogService.info("Configuration Service initialized", "CoreService");
        this.lastSynced = Date.now();
        this.isInitialized = true;
        this.save();
      });
    }
  }

  async loadDockerRunItems(): Promise<void> {
    try {
      const dataPath = path.join(this.context.extensionPath, "data");
      const dockerFileName = vscode.Uri.file(path.join(dataPath, "docker.json"));
      LogService.info(`Loading docker items from ${dockerFileName.fsPath}`, "ConfigurationService");
      const file = await vscode.workspace.fs.readFile(dockerFileName);
      const jsonObj = JSON.parse(file.toString());
      this.dockerRunItems = jsonObj;
      if (this.loadDockerRunItems != undefined && this.dockerRunItems.length > 0) {
        vscode.commands.executeCommand("setContext", FLAG_DOCKER_CONTAINER_ITEMS_EXISTS, true);
      } else {
        vscode.commands.executeCommand("setContext", FLAG_DOCKER_CONTAINER_ITEMS_EXISTS, false);
      }
    } catch (e) {
      LogService.error(`Error loading docker items ${e}`, "ConfigurationService");
    }
  }

  toJson(): any {
    const config = {
      virtualMachinesGroup: this.virtualMachinesGroups,
      catalogProviders: this.catalogProviders,
      remoteHostProviders: this.remoteHostProviders,
      featureFlags: this.featureFlags,
      hardwareInfo: this.hardwareInfo,
      parallelsDesktopServerInfo: this.parallelsDesktopServerInfo,
      locale: this.locale,
      tools: this.tools,
      lastSynced: this.lastSynced,
      lastHeartbeat: this.lastHeartbeat
    };

    return JSON.stringify(config, null, 2);
  }

  existsVirtualMachineGroup(name: string): boolean {
    if (name === FLAG_NO_GROUP) {
      return this.allGroups.some(group => group.name.toLowerCase() === name.toLowerCase());
    }
    return this.allGroups.some(
      group => group.path?.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
    );
  }

  getVirtualMachineGroup(name: string): VirtualMachineGroup | undefined {
    if (name === FLAG_NO_GROUP) {
      return this.allGroups.find(group => group.name.toLowerCase() === name.toLowerCase());
    } else if (/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(name)) {
      return this.allGroups.find(group => group.uuid.toLowerCase() === name.toLowerCase());
    } else if (name.startsWith("/")) {
      return this.allGroups.find(group => `${group.path?.toLowerCase()}` === name.toLowerCase());
    } else {
      this.allGroups.find(
        group => group.name.toLowerCase() === name.toLowerCase() || group.uuid.toLowerCase() === name.toLowerCase()
      );
    }
  }

  getVirtualMachine(nameOrId: string): VirtualMachine | undefined {
    return this.allMachines.find(
      machine =>
        machine.Name.toLowerCase() === nameOrId.toLowerCase() || machine.ID.toLowerCase() === nameOrId.toLowerCase()
    );
  }

  save() {
    if (!configurationInitialized) {
      console.error("Configuration not initialized");
      return;
    }
    const configFolder = getUserProfileFolder();
    const userProfile = path.join(configFolder, "profile.json");

    // Backing up before writing
    if (fs.existsSync(userProfile)) {
      const backupPath = path.join(configFolder, `profile.json.bck`);
      fs.renameSync(userProfile, backupPath);
    }

    fs.writeFileSync(userProfile, this.toJson());
  }

  backup() {
    LogService.info("Backing up configuration", "CoreService");
    const configFolder = getUserProfileFolder();
    const userProfile = path.join(configFolder, "profile.json");
    const backupPath = path.join(configFolder, `profile.json.startup.bck`);
    if (fs.existsSync(userProfile)) {
      fs.cpSync(userProfile, backupPath);
    }
  }

  addVirtualMachineGroup(group: VirtualMachineGroup) {
    if (group.path === undefined) {
      group.path = "/";
    }
    if (!this.existsVirtualMachineGroup(group.name)) {
      if (group.name.startsWith("/")) {
        group.name = group.name.slice(1);
      }
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

  renameVirtualMachine(nameOrId: string, newName: string) {
    const machine = this.getVirtualMachine(nameOrId);
    if (machine) {
      machine.Name = newName;
      this.save();
    }
  }
  vmExistsInGroup(uuid: string): string | undefined {
    const groups = this.allGroups;
    for (const group of groups) {
      if (group?.existsVm(uuid)) {
        return group.uuid;
      }
    }

    return undefined;
  }

  moveGroupToGroup(groupName: string, destination: string) {
    const group = this.getVirtualMachineGroup(groupName);
    const destinationGroup = this.getVirtualMachineGroup(destination);
    if (group && destinationGroup) {
      const futurePath = `${destinationGroup.path}/${group.name}`;
      const pathExists = this.allGroups.some(group => group.path === futurePath);
      if (pathExists) {
        vscode.window.showErrorMessage(`A group with the destination ${futurePath} already exists`);
        return;
      }
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
    const shouldOrder = settings.get<boolean>(FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY);
    if (shouldOrder) {
      this.virtualMachinesGroups.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      const groups = this.allGroups;
      groups.forEach(group => {
        group.sortGroups();
      });
    }
  }

  addCatalogProvider(provider: DevOpsCatalogHostProvider): boolean {
    const catalogExistsId = this.findCatalogProviderByIOrName(provider.ID);
    if (catalogExistsId) {
      vscode.window.showErrorMessage(`A catalog provider with the id ${provider.ID} already exists`);
      return false;
    }

    const catalogNameExists = this.findCatalogProviderByIOrName(provider.name);
    if (catalogNameExists) {
      vscode.window.showErrorMessage(`A catalog provider with the name ${provider.name} already exists`);
      return false;
    }

    this.catalogProviders.push(provider);
    this.save();
    return true;
  }

  renameRemoteProvider(provider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider, newName: string): boolean {
    if (!provider) {
      vscode.window.showErrorMessage(`Provider not found`);
      return false;
    }
    let foundProvider: DevOpsCatalogHostProvider | DevOpsRemoteHostProvider | undefined;
    if (provider.class === "DevOpsRemoteHostProvider") {
      foundProvider = this.findRemoteHostProviderById(provider.ID);
    }
    if (provider.class === "DevOpsCatalogHostProvider") {
      foundProvider = this.findCatalogProviderByIOrName(provider.ID);
    }
    if (!foundProvider) {
      vscode.window.showErrorMessage(`Remote Host Provider User ${provider.name} not found`);
      return false;
    }

    if (provider.class === "DevOpsCatalogHostProvider") {
      const catalogProvider = foundProvider as DevOpsCatalogHostProvider;
      const index = this.catalogProviders.indexOf(catalogProvider);
      this.catalogProviders[index].name = newName;
    }
    if (provider.class === "DevOpsRemoteHostProvider") {
      const remoteProvider = foundProvider as DevOpsRemoteHostProvider;
      const index = this.remoteHostProviders.indexOf(remoteProvider);
      this.remoteHostProviders[index].name = newName;
    }

    this.save();
    return true;
  }

  removeCatalogProvider(providerId: string): boolean {
    const provider = this.findCatalogProviderByIOrName(providerId);
    if (provider) {
      this.catalogProviders = this.catalogProviders.filter(
        provider => provider.ID.toLowerCase() !== providerId.toLowerCase()
      );
      this.save();
      return true;
    }
    return false;
  }

  updateCatalogProviderState(providerId: string, state: "active" | "inactive" | "unknown") {
    for (const provider of this.catalogProviders) {
      if (provider.ID === providerId) {
        if (provider.state !== state) {
          provider.state = state;
          provider.updatedAt = new Date().toISOString();
          this.save();
        }
        break;
      }
    }
  }

  findCatalogProviderByIOrName(id: string): DevOpsCatalogHostProvider | undefined {
    const filteredResult = this.catalogProviders.find(
      provider => provider.ID.toLowerCase() === id.toLowerCase() || provider.name.toLowerCase() === id.toLowerCase()
    );
    return filteredResult;
  }

  findCatalogProviderManifest(providerId: string, manifestName: string): CatalogManifestItem | undefined {
    const provider = this.findCatalogProviderByIOrName(providerId);
    if (provider) {
      const manifest = provider.manifests.find(manifest => manifest.name.toLowerCase() === manifestName.toLowerCase());
      return manifest;
    }
  }

  getCatalogProviderManifestVersions(providerId: string, manifestName: string): CatalogManifest[] {
    const provider = this.findCatalogProviderByIOrName(providerId);
    if (provider) {
      const manifest = provider.manifests.find(manifest => manifest.name.toLowerCase() === manifestName.toLowerCase());
      if (manifest) {
        return manifest.items;
      }
    }

    return [];
  }

  get allCatalogProviders(): DevOpsCatalogHostProvider[] {
    const providers: DevOpsCatalogHostProvider[] = [];
    if (this.catalogProviders?.length > 0) {
      this.catalogProviders.forEach(provider => {
        providers.push(provider);
      });
    }
    return providers.sort((a, b) => a.name.localeCompare(b.name));
  }

  addRemoteHostProvider(provider: DevOpsRemoteHostProvider): boolean {
    const remoteProviderHostExists = this.findRemoteHostProviderByHost(provider.rawHost ?? "");
    if (remoteProviderHostExists && remoteProviderHostExists.type === provider.type) {
      vscode.window.showErrorMessage(`A remote host provider with the id ${provider.ID} already exists`);
      return false;
    }

    const remoteProviderNameExists = this.findRemoteHostProviderByName(provider.name);
    if (remoteProviderNameExists) {
      vscode.window.showErrorMessage(`A remote host provider with the name ${provider.name} already exists`);
      return false;
    }

    this.remoteHostProviders.push(provider);
    this.save();
    return true;
  }

  removeRemoteHostProvider(providerId: string): boolean {
    const provider = this.findRemoteHostProviderById(providerId);
    if (provider) {
      this.remoteHostProviders = this.remoteHostProviders.filter(
        provider => provider.ID.toLowerCase() !== providerId.toLowerCase()
      );
      this.save();
      return true;
    }
    return false;
  }

  updateRemoteHostProviderState(providerId: string, state: "active" | "inactive" | "disabled" | "unknown") {
    for (const provider of this.remoteHostProviders) {
      if (provider.ID === providerId) {
        const providerState = provider.state;
        if (provider.state !== state) {
          provider.state = state;
          provider.updatedAt = new Date().toISOString();
          this.save();
        }
        break;
      }
    }
  }

  findRemoteHostProviderByHost(host: string): DevOpsRemoteHostProvider | undefined {
    const hostname = parseHost(host);
    const filteredResult = this.remoteHostProviders.find(
      provider => provider.rawHost.toLowerCase() === hostname.hostname.toLowerCase()
    );
    return filteredResult;
  }

  findRemoteHostProviderByName(name: string): DevOpsRemoteHostProvider | undefined {
    const filteredResult = this.remoteHostProviders.find(
      provider => provider.name.toLowerCase() === name.toLowerCase()
    );
    return filteredResult;
  }

  findRemoteHostProviderById(id: string): DevOpsRemoteHostProvider | undefined {
    const filteredResult = this.remoteHostProviders.find(provider => provider.ID.toLowerCase() === id.toLowerCase());
    return filteredResult;
  }

  findRemoteHostProviderHostById(providerId: string, id: string): DevOpsRemoteHost | undefined {
    const provider = this.remoteHostProviders.find(provider => provider.ID.toLowerCase() === providerId.toLowerCase());
    if (provider) {
      return provider.hosts?.find(host => host.id.toLowerCase() === id.toLowerCase());
    }
    return undefined;
  }

  findRemoteHostProviderVirtualMachine(providerId: string, virtualMachineId: string): VirtualMachine | undefined {
    const provider = this.remoteHostProviders.find(
      provider =>
        provider.ID.toLowerCase() === providerId.toLowerCase() ||
        provider.name.toLowerCase() === providerId.toLowerCase() ||
        provider.host?.toLowerCase() === providerId.toLowerCase()
    );
    if (provider) {
      return provider.virtualMachines?.find(
        virtualMachine =>
          virtualMachine.ID.toLowerCase() === virtualMachineId.toLowerCase() ||
          virtualMachine.Name.toLowerCase() === virtualMachineId.toLowerCase()
      );
    }
    return undefined;
  }

  get allRemoteHostProviders(): DevOpsRemoteHostProvider[] {
    const providers: DevOpsRemoteHostProvider[] = [];
    if (this.remoteHostProviders?.length > 0) {
      this.remoteHostProviders.forEach(provider => {
        providers.push(provider);
      });
    }

    return providers.sort((a, b) => a.name.localeCompare(b.name));
  }

  updateDevOpsHostsProviderState(providerId: string, state: "active" | "inactive" | "unknown") {
    for (const provider of this.remoteHostProviders) {
      if (provider.ID === providerId) {
        this.updateRemoteHostProviderState(providerId, state);
        break;
      }
    }
    for (const provider of this.catalogProviders) {
      if (provider.ID === providerId) {
        this.updateCatalogProviderState(providerId, state);
        break;
      }
    }
  }

  sortVms() {
    const settings = Provider.getSettings();
    if (settings.get<boolean>(FLAG_EXTENSION_ORDER_TREE_ALPHABETICALLY)) {
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

  initParallelsDesktop(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      LogService.info("Initializing Parallels Desktop", "ConfigService");
      if (this.tools.parallelsDesktop === undefined) {
        this.tools.parallelsDesktop = {
          name: "prlctl",
          version: "",
          isInstalled: false,
          isReady: false
        };
      }

      this.tools.parallelsDesktop.isInstalled =
        (await ParallelsDesktopService.isInstalled().catch(reason => reject(reason))) ?? false;

      if (!this.tools.parallelsDesktop.isInstalled) {
        vscode.commands.executeCommand("setContext", FLAG_PARALLELS_DESKTOP_EXISTS, false);
        LogService.info("Parallels Desktop is not installed", "ConfigService");
        return resolve(false);
      }
      this.tools.parallelsDesktop.isReady = true;

      ParallelsDesktopService.getServerInfo()
        .then(async info => {
          LogService.info("Parallels Desktop is installed", "ConfigService");
          LogService.info("Getting Parallels Desktop Server Info", "ConfigService");
          this.parallelsDesktopServerInfo = info;
          this.tools.parallelsDesktop.version = info.Version;
          vscode.commands.executeCommand("setContext", FLAG_PARALLELS_DESKTOP_EXISTS, true);
          LogService.info("Getting the new Vms", "ConfigService");
          const vms = (await ParallelsDesktopService.getVms().catch(reason => reject(reason))) ?? [];
          if (vms.length > 0) {
            vscode.commands.executeCommand("setContext", FLAG_HAS_VIRTUAL_MACHINES, true);
          } else {
            vscode.commands.executeCommand("setContext", FLAG_HAS_VIRTUAL_MACHINES, false);
          }
          vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
          resolve(true);
        })
        .catch(reason => {
          vscode.commands.executeCommand("setContext", FLAG_PARALLELS_DESKTOP_EXISTS, false);
          this.tools.parallelsDesktop.isInstalled = false;
          this.tools.parallelsDesktop.version = "";
          LogService.error(`Parallels Desktop is not installed, err: ${reason}`, "ConfigService");
          return resolve(true);
        });
    });
  }

  initBrew(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      LogService.info("Initializing Brew", "ConfigService");
      if (this.tools.brew === undefined) {
        this.tools.brew = {
          name: "brew",
          version: "",
          isInstalled: false,
          isReady: false
        };
      }

      this.tools.brew.isInstalled = (await BrewService.isInstalled().catch(reason => reject(reason))) ?? false;

      if (!this.tools.brew.isInstalled) {
        LogService.info("Brew is not installed", "ConfigService");
        return resolve(false);
      }

      this.tools.brew.isReady = true;

      BrewService.version()
        .then(version => {
          this.tools.brew.version = version;
          return resolve(true);
        })
        .catch(reason => {
          this.tools.brew.isInstalled = false;
          this.tools.brew.version = "";
          LogService.error(`Brew is not installed, err: ${reason}`, "ConfigService");
          return resolve(false);
        });
    });
  }

  initGit(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      LogService.info("Initializing Git", "ConfigService");
      if (this.tools.git === undefined) {
        this.tools.git = {
          name: "git",
          version: "",
          isInstalled: false,
          isReady: false
        };
      }

      this.tools.git.isInstalled = (await GitService.isInstalled().catch(reason => reject(reason))) ?? false;

      if (!this.tools.git.isInstalled) {
        LogService.info("Git is not installed", "ConfigService");
        return resolve(false);
      }

      GitService.version()
        .then(version => {
          this.tools.git.version = version;
          return resolve(true);
        })
        .catch(reason => {
          this.tools.git.isInstalled = false;
          this.tools.git.version = "";
          LogService.error(`Git is not installed, err: ${reason}`, "ConfigService");
          return resolve(false);
        });
    });
  }

  initDevOpsService(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      LogService.info("Initializing Parallels DevOps Service", "ConfigService");
      if (this.tools.devopsService === undefined) {
        this.tools.devopsService = {
          name: "prldevops",
          version: "",
          isInstalled: false,
          isReady: false
        };
      }

      this.tools.devopsService.isInstalled =
        (await DevOpsService.isInstalled().catch(reason => reject(reason))) ?? false;

      if (!this.tools.devopsService.isInstalled) {
        LogService.info("Parallels DevOps Service is not installed", "ConfigService");
        vscode.commands.executeCommand("setContext", FLAG_DEVOPS_SERVICE_EXISTS, false);
        return resolve(false);
      }

      DevOpsService.version()
        .then(version => {
          this.tools.devopsService.version = version;
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_SERVICE_EXISTS, true);
          return resolve(true);
        })
        .catch(reason => {
          this.tools.devopsService.isInstalled = false;
          this.tools.devopsService.version = "";
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_SERVICE_EXISTS, false);
          LogService.error(`Parallels DevOps Service is not installed, err: ${reason}`, "ConfigService");
          return resolve(false);
        });
    });
  }

  initPacker(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      LogService.info("Initializing Packer", "ConfigService");
      if (this.tools.packer === undefined) {
        this.tools.packer = {
          name: "packer",
          version: "",
          isInstalled: false,
          isReady: false
        };
      }
      this.tools.packer.isInstalled = (await PackerService.isInstalled().catch(reason => reject(reason))) ?? false;

      if (!this.tools.packer.isInstalled) {
        LogService.info("Packer is not installed", "ConfigService");
        vscode.commands.executeCommand("setContext", FLAG_PACKER_EXISTS, false);
        return resolve(false);
      }

      this.tools.packer.isReady = true;

      PackerService.version()
        .then(version => {
          this.tools.packer.version = version;
          vscode.commands.executeCommand("setContext", FLAG_PACKER_EXISTS, true);
          return resolve(true);
        })
        .catch(reason => {
          vscode.commands.executeCommand("setContext", FLAG_PACKER_EXISTS, false);
          this.tools.packer.version = "";
          this.tools.packer.isInstalled = false;
          LogService.error(`Packer is not installed, err: ${reason}`, "ConfigService");
          return resolve(false);
        });
    });
  }

  initVagrant(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      LogService.info("Initializing Vagrant", "ConfigService");
      if (this.tools.vagrant === undefined) {
        this.tools.vagrant = {
          name: "vagrant",
          version: "",
          isInstalled: false,
          isReady: false
        };
      }
      this.tools.vagrant.isInstalled = (await VagrantService.isInstalled().catch(reason => reject(reason))) ?? false;

      if (!this.tools.vagrant.isInstalled) {
        LogService.info("Vagrant is not installed", "ConfigService");
        vscode.commands.executeCommand("setContext", FLAG_VAGRANT_EXISTS, false);
        return resolve(false);
      }

      VagrantService.isPluginInstalled()
        .then(installed => {
          if (installed) {
            this.tools.vagrant.isReady = true;
          } else {
            VagrantService.installParallelsPlugin()
              .then(successfullyInstalled => {
                if (successfullyInstalled) {
                  this.tools.vagrant.isReady = true;
                } else {
                  this.tools.vagrant.isReady = false;
                }
              })
              .catch(error => {
                this.tools.vagrant.isReady = false;
              });
          }
        })
        .catch(error => {
          this.tools.vagrant.isReady = false;
        });

      VagrantService.version()
        .then(async version => {
          this.tools.vagrant.version = version;
          const boxes = await VagrantService.getBoxes();
          if (boxes.length > 0) {
            vscode.commands.executeCommand("setContext", FLAG_HAS_VAGRANT_BOXES, true);
          } else {
            vscode.commands.executeCommand("setContext", FLAG_HAS_VAGRANT_BOXES, false);
          }
          vscode.commands.executeCommand("setContext", FLAG_VAGRANT_EXISTS, true);

          return resolve(true);
        })
        .catch(reason => {
          vscode.commands.executeCommand("setContext", FLAG_VAGRANT_EXISTS, false);
          this.tools.vagrant.isInstalled = false;
          this.tools.vagrant.version = "";
          LogService.error(`Vagrant is not installed, err: ${reason}`, "ConfigService");
          return resolve(true);
        });
    });
  }
}
