import {DragAndDropTreeItem} from "./../treeItems/virtualMachineTreeItem";
import * as vscode from "vscode";
import * as uuid from "uuid";
import {Provider} from "../../ioc/provider";
import {VirtualMachineTreeItem} from "../treeItems/virtualMachineTreeItem";
import {
  CommandsFlags,
  FLAG_AUTO_REFRESH,
  FLAG_AUTO_REFRESH_INTERVAL,
  FLAG_EXTENSION_SHOW_FLAT_SNAPSHOT_TREE,
  FLAG_NO_GROUP
} from "../../constants/flags";
import {VirtualMachine} from "../../models/parallels/virtualMachine";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {parallelsOutputChannel} from "../../helpers/channel";
import {MachineSnapshot} from "../../models/parallels/virtualMachineSnapshot";
import {DockerContainer} from "../../models/docker/dockerContainer";
import {DockerService} from "../../services/dockerService";
import {DockerImage} from "../../models/docker/dockerImage";
import {LogService} from "../../services/logService";
import {AllVirtualMachineCommands} from "../commands/AllCommands";
import {ParallelsShortLicense} from "../../models/parallels/ParallelsJsonLicense";

let autoRefreshMyVirtualMachinesInterval: NodeJS.Timeout | undefined;
let isAutoRefreshMyVirtualMachinesRunning = false;

export class VirtualMachineProvider
  implements vscode.TreeDataProvider<VirtualMachineTreeItem>, vscode.TreeDragAndDropController<VirtualMachineTreeItem>
{
  config = Provider.getConfiguration();
  settings = Provider.getSettings();
  dropMimeTypes = ["application/vnd.code.tree.parallels-desktop-my-machines"];
  dragMimeTypes = ["text/uri-list"];
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, license: ParallelsShortLicense) {
    this.context = context;
    const view = vscode.window.createTreeView("parallels-desktop-my-machines", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: this
    });
    context.subscriptions.push(view);

    view.onDidChangeVisibility(e => {
      if (e.visible) {
        LogService.info("Starting auto refresh for Virtual Machine Tree View", "VirtualMachineProvider");
        if (license.edition === "pro" || license.edition === "professional" || license.edition === "business") {
          startMyVirtualMachinesAutoRefresh();
        }

        // Send telemetry event
        const telemetry = Provider.telemetry();
        telemetry.sendHeartbeat();
      } else {
        LogService.info("Stopping auto refresh for Virtual Machine Tree View", "VirtualMachineProvider");
        stopMyVirtualMachinesAutoRefresh();
      }
    });

    AllVirtualMachineCommands.forEach(oc => oc.register(context, this));
  }

  data: VirtualMachineTreeItem[] = [];

  getTreeItem(element: VirtualMachineTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<VirtualMachineTreeItem | undefined | null | void> =
    new vscode.EventEmitter<VirtualMachineTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<VirtualMachineTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  async refresh(element?: VirtualMachineTreeItem): Promise<void> {
    this._onDidChangeTreeData.fire(undefined);
  }

  onDidChangeSelection(selection: VirtualMachineTreeItem[]): void {
    console.log("onDidChangeSelection", selection);
  }

  drawRootGroupsItems(): Promise<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      const data: VirtualMachineTreeItem[] = [];
      const allGroups = Provider.getConfiguration().virtualMachinesGroups;
      allGroups.forEach(group => {
        if (group.name !== FLAG_NO_GROUP) {
          const groupState = group.state;
          let icon = "group";
          if (groupState === "running") {
            icon = "group_running";
          } else if (groupState === "paused" || groupState === "suspended") {
            icon = "group_paused";
          }
          const visibility = group.hidden ? "hidden" : "visible";
          if ((!group.hidden || this.config.showHidden) && !this.checkIfExists(data, group.uuid)) {
            data.push(
              new VirtualMachineTreeItem(
                this.context,
                group,
                "Group",
                FLAG_NO_GROUP,
                group.uuid,
                undefined,
                group.name,
                group.name,
                "",
                `group.${visibility}.${groupState}`,
                group.visibleVmsCount > 0 || group.visibleGroupsCount > 0
                  ? vscode.TreeItemCollapsibleState.Collapsed
                  : vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        }
      });
      const noGroup = allGroups.find(g => g.name === FLAG_NO_GROUP);
      if (noGroup !== undefined) {
        noGroup.machines.forEach(vm => {
          let icon = `virtual_machine${vm.Advanced["Rosetta Linux"] !== "on" ? "" : "_rosetta"}`;
          if (vm.State === "running") {
            icon = `virtual_machine_running${vm.Advanced["Rosetta Linux"] !== "on" ? "" : "_rosetta"}`;
          } else if (vm.State === "paused" || vm.State === "suspended") {
            icon = `virtual_machine_paused${vm.Advanced["Rosetta Linux"] !== "on" ? "" : "_rosetta"}`;
          }
          const visibility = vm.hidden ? "hidden" : "visible";
          const description =
            vm.configuredIpAddress === undefined || vm.configuredIpAddress === "-"
              ? vm.State
              : `${vm.State} (${vm.configuredIpAddress})`;
          if ((!vm.hidden || this.config.showHidden) && !this.checkIfExists(data, vm.ID)) {
            data.push(
              new VirtualMachineTreeItem(
                this.context,
                vm,
                "VirtualMachine",
                FLAG_NO_GROUP,
                vm.ID,
                vm.ID,
                vm.Name,
                vm.Name,
                vm.State,
                `vm.${vm.OS}.${visibility}.${vm.Advanced["Rosetta Linux"] === "on" ? "rosetta_on" : "rosetta_off"}.${
                  vm.State
                }`,
                vm.OS === "macosx" ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
                icon,
                description
              )
            );
          }
        });
      }

      resolve(data);
    });
  }

  checkIfExists(data: VirtualMachineTreeItem[], vmId: string): boolean {
    data.forEach(element => {
      if (element.id.toLowerCase() === vmId.toLowerCase()) {
        if (element.name.toLowerCase().indexOf("vagrant_temp") >= 0) {
          data.splice(data.indexOf(element), 1);
          return false;
        }
        return true;
      }
    });
    return false;
  }
  drawFlatSnapshotList(
    parent: VirtualMachineTreeItem,
    snapshots: MachineSnapshot[]
  ): Promise<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      const children: VirtualMachineTreeItem[] = [];
      const flatSnapshotList = this.drawSnapshotListItem(snapshots, undefined, false, 0);

      if (flatSnapshotList.length > 0 && flatSnapshotList[flatSnapshotList.length - 1].name.startsWith("|")) {
        flatSnapshotList[flatSnapshotList.length - 1].name = flatSnapshotList[flatSnapshotList.length - 1].name.replace(
          "|",
          "└"
        );
      }
      flatSnapshotList.forEach(snapshot => {
        children.push(
          new VirtualMachineTreeItem(
            this.context,
            parent.item,
            "Snapshot",
            undefined,
            snapshot.id,
            parent.vmId,
            snapshot.name,
            snapshot.name,
            snapshot.state,
            `snapshot.${snapshot.current ? "current" : "other"}`,
            vscode.TreeItemCollapsibleState.None,
            snapshot.current ? "snapshot_current" : "snapshot"
          )
        );
      });

      resolve(children);
    });
  }

  drawSnapshotListItem(
    snapshots: MachineSnapshot[],
    item?: MachineSnapshot,
    hasChildren = false,
    level = 0,
    prefix = "|  ",
    suffix = "├"
  ): MachineSnapshot[] {
    const result: MachineSnapshot[] = [];
    let parentId = "";
    if (item !== undefined) {
      parentId = item.id;
      item.name = `${prefix}${suffix} ${item.name}`;
      result.push(item);
    }
    const children = snapshots.filter(f => f.parent === parentId);
    if (children.length > 0) {
      let childPrefix = prefix;
      if (level > 0) {
        if (hasChildren) {
          childPrefix = childPrefix + " │   ";
        } else {
          childPrefix = childPrefix + "    ";
        }
      } else {
        childPrefix = "";
      }

      children.forEach((child, index) => {
        const hasChildren = snapshots.filter(f => f.parent === child.id).length > 0;
        if (index === children.length - 1) {
          suffix = `└`;
        } else {
          suffix = `├`;
        }
        result.push(
          ...this.drawSnapshotListItem(
            snapshots,
            child,
            hasChildren && children.length > 1,
            level + 1,
            childPrefix,
            suffix
          )
        );
      });
    }

    return result;
  }

  drawVirtualMachineItems(item: VirtualMachineTreeItem): Promise<VirtualMachineTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      const children: VirtualMachineTreeItem[] = [];
      const vm = item.item as VirtualMachine;
      let dockerContainers: DockerContainer[] | undefined = undefined;
      let dockerImages: DockerImage[] | undefined = undefined;
      if (item.status === "running" && vm.OS.toLowerCase() !== "macosx" && vm.OS.toLowerCase() !== "win-11") {
        let dockerExitedCode = 0;
        await DockerService.getVmContainers(item.id)
          .then(images => {
            dockerContainers = [];
            images.forEach(image => {
              dockerContainers?.push(image);
            });
          })
          .catch(error => {
            dockerExitedCode = 1;
            LogService.error(error);
          });

        if (dockerExitedCode === 0) {
          if ((item.status === "running" && vm.OS.toLowerCase() != "macosx") || vm.OS.toLowerCase() != "win-11") {
            await DockerService.getVmDockerImages(item.id)
              .then(images => {
                dockerImages = [];
                images.forEach(image => {
                  dockerImages?.push(image);
                });
              })
              .catch(error => {
                LogService.error(error);
              });
          }
        }
      }

      if (vm.configuredIpAddress != undefined && vm.configuredIpAddress != "-") {
        const ipAddressId = `${vm.ID ?? uuid.v4()}_ip_address_${vm.configuredIpAddress}}`;
        children.push(
          new VirtualMachineTreeItem(
            this.context,
            item.item,
            "IpAddress",
            undefined,
            ipAddressId,
            (item.item as VirtualMachine).ID ?? undefined,
            `IP: ${vm.configuredIpAddress}`,
            `IP: ${vm.configuredIpAddress}`,
            "",
            `vm.ip`,
            vscode.TreeItemCollapsibleState.None,
            "globe",
            undefined,
            {
              command: CommandsFlags.treeCopyIpAddress,
              title: "Copy to clipboard",
              arguments: [vm]
            }
          )
        );
      }

      ParallelsDesktopService.getVmSnapshots(item.id)
        .then(
          snapshots => {
            if (snapshots.length === 0) {
              children.push(
                new VirtualMachineTreeItem(
                  this.context,
                  undefined,
                  "Empty",
                  undefined,
                  uuid.v4(),
                  undefined,
                  "No snapshots",
                  "No snapshots",
                  "",
                  "snapshot",
                  vscode.TreeItemCollapsibleState.None,
                  "snapshot"
                )
              );
            } else if (Provider.getSettings().get<boolean>(FLAG_EXTENSION_SHOW_FLAT_SNAPSHOT_TREE)) {
              const children = this.drawFlatSnapshotList(item, snapshots);
              resolve(children);
            } else {
              snapshots
                .filter(f => f.parent === undefined || f.parent === "")
                .forEach(snap => {
                  const hasChildren = snapshots.filter(f => f.parent === snap.id)?.length > 0;
                  children.push(
                    new VirtualMachineTreeItem(
                      this.context,
                      item.item,
                      "Snapshot",
                      undefined,
                      snap.id,
                      (item.item as VirtualMachine).ID ?? undefined,
                      snap.name,
                      snap.name,
                      snap.state,
                      `snapshot.${snap.current ? "current" : "other"}`,
                      hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                      snap.current ? "snapshot_current" : "snapshot"
                    )
                  );
                });
            }
            if (dockerContainers) {
              const vm = this.config.allMachines.find(f => f.ID === item.id);
              const itemId = `${(item.item as VirtualMachine).ID ?? uuid.v4()}_docker_root`;
              const currentItemInTree = this.data.find(f => f.id === itemId);
              let currentCollapsibleState = currentItemInTree?.collapsibleState;
              if (
                currentCollapsibleState != undefined &&
                currentCollapsibleState === vscode.TreeItemCollapsibleState.None &&
                dockerContainers.length > 0
              ) {
                currentCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
              }
              if (
                currentCollapsibleState != undefined &&
                (currentCollapsibleState === vscode.TreeItemCollapsibleState.Collapsed ||
                  currentCollapsibleState === vscode.TreeItemCollapsibleState.Expanded) &&
                dockerContainers.length == 0
              ) {
                currentCollapsibleState = vscode.TreeItemCollapsibleState.None;
              }
              if (vm !== undefined) {
                vm.dockerContainers = dockerContainers;
                this.config.save();
                children.push(
                  new VirtualMachineTreeItem(
                    this.context,
                    item.item,
                    "DockerContainerRoot",
                    undefined,
                    itemId,
                    (item.item as VirtualMachine).ID ?? undefined,
                    "Docker Containers",
                    "Docker Containers",
                    "",
                    `docker.container.root`,
                    (currentCollapsibleState ?? dockerContainers.length > 0)
                      ? vscode.TreeItemCollapsibleState.Collapsed
                      : vscode.TreeItemCollapsibleState.None,
                    "docker_container"
                  )
                );
              }
            }
            if (dockerImages) {
              const vm = this.config.allMachines.find(f => f.ID === item.id);
              const itemId = `${(item.item as VirtualMachine).ID ?? uuid.v4()}_docker_image_root`;
              const currentItemInTree = this.data.find(f => f.id === itemId);
              let currentCollapsibleState = currentItemInTree?.collapsibleState;
              if (
                currentCollapsibleState != undefined &&
                currentCollapsibleState === vscode.TreeItemCollapsibleState.None &&
                dockerImages.length > 0
              ) {
                currentCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
              }
              if (
                currentCollapsibleState != undefined &&
                (currentCollapsibleState === vscode.TreeItemCollapsibleState.Collapsed ||
                  currentCollapsibleState === vscode.TreeItemCollapsibleState.Expanded) &&
                dockerImages.length == 0
              ) {
                currentCollapsibleState = vscode.TreeItemCollapsibleState.None;
              }
              if (vm !== undefined) {
                vm.dockerImages = dockerImages;
                this.config.save();
                children.push(
                  new VirtualMachineTreeItem(
                    this.context,
                    item.item,
                    "DockerImageRoot",
                    undefined,
                    itemId,
                    (item.item as VirtualMachine).ID ?? undefined,
                    "Docker Images",
                    "Docker Images",
                    "",
                    `docker.image.root`,
                    (currentCollapsibleState ?? dockerImages.length > 0)
                      ? vscode.TreeItemCollapsibleState.Collapsed
                      : vscode.TreeItemCollapsibleState.None,
                    "docker_images"
                  )
                );
              }
            }
            resolve(children);
          },
          reject => {
            vscode.window.showErrorMessage(`Failed to get snapshots for ${item.label}, reason: ${reject}`);
            parallelsOutputChannel.appendLine(reject);
            children.push(
              new VirtualMachineTreeItem(
                this.context,
                undefined,
                "Empty",
                undefined,
                uuid.v4(),
                undefined,
                "Error",
                "Error",
                "",
                "snapshot.error",
                vscode.TreeItemCollapsibleState.None,
                "error"
              )
            );
            resolve(children);
          }
        )
        .catch(reason => {
          vscode.window.showErrorMessage(`Failed to get snapshots for ${item.label}, reason: ${reason}`);
          parallelsOutputChannel.appendLine(reason);
        });
    });
  }

  drawSnapshotItems(item: VirtualMachineTreeItem): Promise<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      const children: VirtualMachineTreeItem[] = [];
      ParallelsDesktopService.getVmSnapshots(item.vmId ?? "")
        .then(
          snapshot => {
            if (snapshot.length === 0) {
              children.push(
                new VirtualMachineTreeItem(
                  this.context,
                  undefined,
                  "Empty",
                  undefined,
                  `${item.id}_no_snapshot`,
                  item.vmId,
                  "No snapshots",
                  "No snapshots",
                  "",
                  "snapshot",
                  vscode.TreeItemCollapsibleState.None,
                  "snapshot"
                )
              );
            }
            snapshot
              .filter(f => f.parent === item.id)
              .forEach(snap => {
                const hasChildren = snapshot.filter(f => f.parent === snap.id)?.length > 0;
                children.push(
                  new VirtualMachineTreeItem(
                    this.context,
                    item.item,
                    "Snapshot",
                    undefined,
                    snap.id,
                    item.vmId,
                    snap.name,
                    snap.name,
                    snap.state,
                    `snapshot.${snap.current ? "current" : "other"}`,
                    hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    snap.current ? "snapshot_current" : "snapshot"
                  )
                );
              });
            resolve(children);
          },
          reject => {
            vscode.window.showErrorMessage(`Failed to get snapshots for ${item.label}, reason: ${reject}`);
            parallelsOutputChannel.appendLine(reject);
            children.push(
              new VirtualMachineTreeItem(
                this.context,
                undefined,
                "Empty",
                undefined,
                uuid.v4(),
                undefined,
                "Error",
                "Error",
                "",
                "snapshot.error",
                vscode.TreeItemCollapsibleState.None,
                "error"
              )
            );
            resolve(children);
          }
        )
        .catch(reason => {
          vscode.window.showErrorMessage(`Failed to get snapshots for ${item.label}, reason: ${reason}`);
          parallelsOutputChannel.appendLine(reason);
        });
    });
  }

  drawGroupItems(item: VirtualMachineTreeItem): Promise<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      const children: VirtualMachineTreeItem[] = [];
      const allGroups = Provider.getConfiguration().allGroups;
      const group = allGroups.find(g => g.name === item.id || g.uuid === item.id);
      if (group !== undefined) {
        group.groups.forEach(childGroup => {
          const groupState = group.state;
          let icon = "group";
          if (groupState === "running") {
            icon = "group_running";
          } else if (groupState === "paused" || groupState === "suspended") {
            icon = "group_paused";
          }
          const visibility = childGroup.hidden ? "hidden" : "visible";
          if ((!childGroup.hidden || this.config.showHidden) && !this.checkIfExists(children, childGroup.uuid)) {
            children.push(
              new VirtualMachineTreeItem(
                this.context,
                childGroup,
                "Group",
                group.uuid,
                childGroup.uuid,
                undefined,
                childGroup.name,
                childGroup.name,
                "",
                `group.${visibility}.${groupState}`,
                childGroup.visibleVmsCount > 0 || childGroup.visibleGroupsCount > 0
                  ? vscode.TreeItemCollapsibleState.Collapsed
                  : vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        });
        group.machines.forEach(childVm => {
          let icon = `virtual_machine${childVm.Advanced["Rosetta Linux"] !== "on" ? "" : "_rosetta"}`;
          if (childVm.State === "running") {
            icon = `virtual_machine_running${childVm.Advanced["Rosetta Linux"] !== "on" ? "" : "_rosetta"}`;
          } else if (childVm.State === "paused" || childVm.State === "suspended") {
            icon = `virtual_machine_paused${childVm.Advanced["Rosetta Linux"] !== "on" ? "" : "_rosetta"}`;
          }
          const visibility = childVm.hidden ? "hidden" : "visible";
          const description =
            childVm.configuredIpAddress === undefined || childVm.configuredIpAddress === "-"
              ? childVm.State
              : `${childVm.State} (${childVm.configuredIpAddress})`;
          if ((!childVm.hidden || this.config.showHidden) && !this.checkIfExists(children, childVm.ID)) {
            children.push(
              new VirtualMachineTreeItem(
                this.context,
                childVm,
                "VirtualMachine",
                group.uuid,
                childVm.ID,
                childVm.ID,
                childVm.Name,
                childVm.Name,
                childVm.State,
                `vm.${childVm.OS}.${visibility}.${
                  childVm.Advanced["Rosetta Linux"] === "on" ? "rosetta_on" : "rosetta_off"
                }.${childVm.State}`,
                childVm.OS === "macosx"
                  ? vscode.TreeItemCollapsibleState.None
                  : vscode.TreeItemCollapsibleState.Collapsed,
                icon,
                description
              )
            );
          }
        });
      }
      resolve(children);
    });
  }

  drawDockerContainerItems(item: VirtualMachineTreeItem): Promise<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      const data: VirtualMachineTreeItem[] = [];
      const vm = this.config.allMachines.find(m => m.ID === item.vmId);
      if (vm !== undefined && vm.dockerContainers.length > 0) {
        vm.dockerContainers.forEach(dockerContainer => {
          data.push(
            new VirtualMachineTreeItem(
              this.context,
              vm,
              "DockerContainer",
              undefined,
              `${vm.ID}${dockerContainer.ID}`,
              vm.ID,
              dockerContainer.Names,
              `${dockerContainer.Names}`,
              dockerContainer.State,
              `docker.container.${dockerContainer.State}`,
              vscode.TreeItemCollapsibleState.None,
              `${
                dockerContainer.State === "running"
                  ? "container_running"
                  : dockerContainer.State === "paused"
                    ? "container_paused"
                    : "container"
              }`,
              `${dockerContainer.Status} (${dockerContainer.Image})`
            )
          );
        });
      }
      resolve(data);
    });
  }

  drawDockerImagesItems(item: VirtualMachineTreeItem): Promise<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      const data: VirtualMachineTreeItem[] = [];
      const vm = this.config.allMachines.find(m => m.ID === item.vmId);
      if (vm !== undefined && vm.dockerImages.length > 0) {
        vm.dockerImages.forEach(dockerImage => {
          data.push(
            new VirtualMachineTreeItem(
              this.context,
              vm,
              "DockerImage",
              undefined,
              `${vm.ID}${dockerImage.ID}`,
              vm.ID,
              dockerImage.Repository,
              `${dockerImage.Repository}`,
              dockerImage.Tag,
              `docker.image.${dockerImage.Tag}`,
              vscode.TreeItemCollapsibleState.None,
              "docker_image"
            )
          );
        });
      }
      resolve(data);
    });
  }

  getChildren(element?: VirtualMachineTreeItem): Thenable<VirtualMachineTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      const config = Provider.getConfiguration();
      if (config.license_edition !== "pro" && config.license_edition !== "business") {
        return resolve([]);
      }

      const allGroups = Provider.getConfiguration().virtualMachinesGroups;
      if (element === undefined) {
        const children = await this.drawRootGroupsItems();
        children.forEach(child => {
          const exists = this.data.findIndex(d => d.id === child.id);
          if (exists !== -1) {
            this.data.splice(exists, 1);
          }
          this.data.push(child);
        });
        return resolve(children);
      } else {
        if (element.type === "VirtualMachine") {
          const children = await this.drawVirtualMachineItems(element);
          children.forEach(child => {
            const exists = this.data.findIndex(d => d.id === child.id);
            if (exists !== -1) {
              this.data.splice(exists, 1);
            }
            this.data.push(child);
          });
          return resolve(children);
        } else if (element.type === "Snapshot") {
          const children = await this.drawSnapshotItems(element);
          children.forEach(child => {
            const exists = this.data.findIndex(d => d.id === child.id);
            if (exists !== -1) {
              this.data.splice(exists, 1);
            }
            this.data.push(child);
          });
          return resolve(children);
        } else if (element.type === "DockerContainerRoot") {
          const children = await this.drawDockerContainerItems(element);
          children.forEach(child => {
            const exists = this.data.findIndex(d => d.id === child.id);
            if (exists !== -1) {
              this.data.splice(exists, 1);
            }
            this.data.push(child);
          });
          return resolve(children);
        } else if (element.type === "DockerImageRoot") {
          const children = await this.drawDockerImagesItems(element);
          children.forEach(child => {
            const exists = this.data.findIndex(d => d.id === child.id);
            if (exists !== -1) {
              this.data.splice(exists, 1);
            }
            this.data.push(child);
          });
          return resolve(children);
        } else if (element.type === "Group") {
          const children = await this.drawGroupItems(element);
          children.forEach(child => {
            const exists = this.data.findIndex(d => d.id === child.id);
            if (exists !== -1) {
              this.data.splice(exists, 1);
            }
            this.data.push(child);
          });
          return resolve(children);
        }
      }
    });
  }

  public async handleDrag(
    source: readonly VirtualMachineTreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    if (source.length === 0) {
      token.isCancellationRequested = true;
    }

    const targets: DragAndDropTreeItem[] = [];
    source.forEach(item => {
      const treeItem = item as VirtualMachineTreeItem;
      if (treeItem.type === "Group") {
        targets.push({type: "Group", id: treeItem.id, name: treeItem.name, group: treeItem.group});
      } else if (treeItem.type === "VirtualMachine") {
        targets.push({type: "VirtualMachine", id: treeItem.id, name: treeItem.name, group: treeItem.group});
      }
    });

    dataTransfer.set("application/vnd.code.tree.parallels-desktop-my-machines", new vscode.DataTransferItem(targets));
  }

  public async handleDrop(
    target: VirtualMachineTreeItem,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const itemsToTransfer: VirtualMachineTreeItem[] = [];

    const transferItem = dataTransfer.get("application/vnd.code.tree.parallels-desktop-my-machines");
    if (!transferItem) {
      return;
    }

    if (!Array.isArray(transferItem.value)) {
      itemsToTransfer.push(transferItem.value as VirtualMachineTreeItem);
    } else {
      itemsToTransfer.push(...(transferItem.value as VirtualMachineTreeItem[]));
    }

    itemsToTransfer.forEach(async item => {
      const treeItem = item as DragAndDropTreeItem;

      if (target === undefined) {
        target = new VirtualMachineTreeItem(
          this.context,
          undefined,
          "Group",
          FLAG_NO_GROUP,
          FLAG_NO_GROUP,
          FLAG_NO_GROUP,
          FLAG_NO_GROUP,
          FLAG_NO_GROUP,
          "",
          "group",
          vscode.TreeItemCollapsibleState.Collapsed,
          "desktop_group_new"
        );
      }

      if (target.type != "Group") {
        return;
      }

      const groups = this.config.allGroups;
      const targetGroup = groups.find(g => g.name === target.id || g.uuid === target.id);
      const sourceGroup = groups.find(g => g.name === treeItem.group || g.uuid === treeItem.group);
      if (targetGroup === undefined) {
        return;
      }
      if (sourceGroup === undefined) {
        return;
      }

      switch (treeItem.type) {
        case "VirtualMachine":
          this.config.moveVmToGroup(treeItem.id, targetGroup.uuid);
          break;
        case "Group":
          if (targetGroup.uuid === treeItem.id) {
            return;
          }

          this.config.moveGroupToGroup(treeItem.id, targetGroup.uuid);
          break;
      }

      sourceGroup.removeVm(treeItem.name);
    });

    Provider.getConfiguration().save();
    this.refresh();
  }
}

export function startMyVirtualMachinesAutoRefresh() {
  if (isAutoRefreshMyVirtualMachinesRunning) {
    LogService.info("Auto refresh is already running, skipping...", "CoreService");
    return;
  }

  isAutoRefreshMyVirtualMachinesRunning = true;
  const settings = Provider.getSettings();
  const cfg = Provider.getConfiguration();
  const autoRefresh = settings.get<boolean>(FLAG_AUTO_REFRESH);
  clearInterval(autoRefreshMyVirtualMachinesInterval);
  if (autoRefresh) {
    LogService.info("Auto refresh is enabled", "CoreService");
    let interval = settings.get<number>(FLAG_AUTO_REFRESH_INTERVAL);
    if (interval === undefined) {
      LogService.info("Auto refresh interval is not defined, setting default to 60 seconds", "CoreService");
      settings.update(FLAG_AUTO_REFRESH_INTERVAL, 60000);
      interval = 60000;
    }
    if (interval < 10000) {
      LogService.info("Auto refresh interval is too low, setting minimum to 10 seconds", "CoreService");
      settings.update(FLAG_AUTO_REFRESH_INTERVAL, 10000);
      interval = 10000;
    }

    LogService.info("Auto refresh interval is " + interval + "ms", "CoreService");
    clearInterval(autoRefreshMyVirtualMachinesInterval);
    autoRefreshMyVirtualMachinesInterval = setInterval(() => {
      LogService.info("Refreshing the virtual machine tree view", "CoreService");
      vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
    }, interval);
  } else {
    if (autoRefreshMyVirtualMachinesInterval) {
      LogService.info("Clearing the auto refresh interval", "CoreService");
      clearInterval(autoRefreshMyVirtualMachinesInterval);
    }
    LogService.info("Auto refresh is disabled", "CoreService");
  }

  isAutoRefreshMyVirtualMachinesRunning = false;
}

export function stopMyVirtualMachinesAutoRefresh() {
  clearInterval(autoRefreshMyVirtualMachinesInterval);
}
