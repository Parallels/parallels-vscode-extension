import {config} from "process";
import * as vscode from "vscode";
import * as uuid from "uuid";
import {Provider} from "../ioc/provider";
import {VirtualMachineTreeItem} from "./virtual_machine_item";
import {FLAG_NO_GROUP, FeatureFlags, SettingsFlags} from "../constants/flags";
import {registerAddGroupCommand} from "./commands/addGroup";
import {registerRemoveGroupCommand} from "./commands/removeGroup";
import {registerViewVmDetailsCommand} from "./commands/viewVmDetails";
import {registerStartVirtualMachineCommand} from "./commands/startVirtualMachine";
import {registerStopVirtualMachineCommand} from "./commands/stopVirtualMachine";
import {registerResumeVirtualMachineCommand} from "./commands/resumeVirtualMachine";
import {registerPauseVirtualMachineCommand} from "./commands/pauseVirtualMachine";
import {registerRefreshVirtualMachineCommand} from "./commands/refreshVirtualMachines";
import {registerStartHeadlessVirtualMachineCommand} from "./commands/startHeadlessVirtualMachine";
import {VirtualMachine} from "../models/virtualMachine";
import {ParallelsDesktopService} from "../services/parallelsDesktopService";
import {registerTakeSnapshotCommand} from "./commands/takeSnapshot";
import {parallelsOutputChannel} from "../helpers/channel";
import {registerDeleteVmSnapshotCommand} from "./commands/deleteVmSnapshot";
import {registerRestoreVmSnapshotCommand} from "./commands/restoreVmSnapshot";
import {registerStopGroupVirtualMachinesCommand} from "./commands/stopGroupVirtualMachines";
import {registerStartGroupVirtualMachinesCommand} from "./commands/startGroupVirtualMachines";
import {registerSuspendVirtualMachineCommand} from "./commands/suspendVirtualMachine";
import {registerPauseGroupVirtualMachinesCommand} from "./commands/pauseGroupVirtualMachines";
import {registerResumeGroupVirtualMachinesCommand} from "./commands/resumeGroupVirtualMachines";
import {registerSuspendGroupVirtualMachinesCommand} from "./commands/suspendGroupVirtualMachines";
import {registerTakeGroupSnapshotCommand} from "./commands/takeGroupSnapshot";
import {registerAddVmCommand} from "./commands/addVm";
import {VirtualMachineGroup} from "../models/virtualMachineGroup";
import {registerToggleShowHiddenCommand} from "./commands/toggleShowHide";
import {registerRenameGroupCommand} from "./commands/renameGroup";
import {MachineSnapshot} from "../models/virtualMachineSnapshot";
import {registerDeleteVmCommand} from "./commands/deleteVm";
import {registerEnterVmCommand} from "./commands/enterVm";

export class VirtualMachineProvider
  implements vscode.TreeDataProvider<VirtualMachineTreeItem>, vscode.TreeDragAndDropController<VirtualMachineTreeItem>
{
  config = Provider.getConfiguration();
  settings = Provider.getSettings();
  dropMimeTypes = ["application/vnd.code.tree.virtualMachine"];
  dragMimeTypes = ["text/uri-list"];

  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("parallels-desktop-machines", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: this
    });
    context.subscriptions.push(view);

    registerAddGroupCommand(context, this);
    registerViewVmDetailsCommand(context, this);
    registerRemoveGroupCommand(context, this);
    registerAddVmCommand(context, this);
    registerStartVirtualMachineCommand(context, this);
    registerStartHeadlessVirtualMachineCommand(context, this);
    registerStopVirtualMachineCommand(context, this);
    registerResumeVirtualMachineCommand(context, this);
    registerPauseVirtualMachineCommand(context, this);
    registerSuspendVirtualMachineCommand(context, this);
    registerDeleteVmCommand(context, this);
    registerEnterVmCommand(context, this);
    registerRefreshVirtualMachineCommand(context, this);
    registerTakeSnapshotCommand(context, this);
    registerDeleteVmSnapshotCommand(context, this);
    registerRestoreVmSnapshotCommand(context, this);
    registerStopGroupVirtualMachinesCommand(context, this);
    registerStartGroupVirtualMachinesCommand(context, this);
    registerPauseGroupVirtualMachinesCommand(context, this);
    registerResumeGroupVirtualMachinesCommand(context, this);
    registerRenameGroupCommand(context, this);
    registerSuspendGroupVirtualMachinesCommand(context, this);
    registerTakeGroupSnapshotCommand(context, this);

    registerToggleShowHiddenCommand(context, this);
  }

  data: VirtualMachineTreeItem[] = [];

  getTreeItem(element: VirtualMachineTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<VirtualMachineTreeItem | undefined | null | void> =
    new vscode.EventEmitter<VirtualMachineTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<VirtualMachineTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
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
          let icon = "virtual_machine";
          if (vm.State === "running") {
            icon = "virtual_machine_running";
          } else if (vm.State === "paused" || vm.State === "suspended") {
            icon = "virtual_machine_paused";
          }
          const visibility = vm.hidden ? "hidden" : "visible";
          if ((!vm.hidden || this.config.showHidden) && !this.checkIfExists(data, vm.ID)) {
            data.push(
              new VirtualMachineTreeItem(
                vm,
                "VirtualMachine",
                FLAG_NO_GROUP,
                vm.ID,
                vm.ID,
                vm.Name,
                vm.Name,
                vm.State,
                `vm.${visibility}.${vm.State}`,
                vm.OS === "macosx" ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
                icon
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
    return new Promise((resolve, reject) => {
      const children: VirtualMachineTreeItem[] = [];
      ParallelsDesktopService.getVmSnapshots(item.id)
        .then(
          snapshots => {
            if (snapshots.length === 0) {
              children.push(
                new VirtualMachineTreeItem(
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
            } else if (Provider.getSettings().get<boolean>(SettingsFlags.treeShowFlatSnapshotList)) {
              const children = this.drawFlatSnapshotList(item, snapshots);
              resolve(children);
            } else {
              snapshots
                .filter(f => f.parent === undefined || f.parent === "")
                .forEach(snap => {
                  const hasChildren = snapshots.filter(f => f.parent === snap.id)?.length > 0;
                  children.push(
                    new VirtualMachineTreeItem(
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
            resolve(children);
          },
          reject => {
            vscode.window.showErrorMessage(`Failed to get snapshots for ${item.label}, reason: ${reject}`);
            parallelsOutputChannel.appendLine(reject);
            children.push(
              new VirtualMachineTreeItem(
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
                  undefined,
                  "Empty",
                  undefined,
                  uuid.v4(),
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
          let icon = "virtual_machine";
          if (childVm.State === "running") {
            icon = "virtual_machine_running";
          } else if (childVm.State === "paused" || childVm.State === "suspended") {
            icon = "virtual_machine_paused";
          }
          const visibility = childVm.hidden ? "hidden" : "visible";
          if ((!childVm.hidden || this.config.showHidden) && !this.checkIfExists(children, childVm.ID)) {
            children.push(
              new VirtualMachineTreeItem(
                childVm,
                "VirtualMachine",
                group.uuid,
                childVm.ID,
                childVm.ID,
                childVm.Name,
                childVm.Name,
                childVm.State,
                `vm.${visibility}.${childVm.State}`,
                childVm.OS === "macosx"
                  ? vscode.TreeItemCollapsibleState.None
                  : vscode.TreeItemCollapsibleState.Collapsed,
                icon
              )
            );
          }
        });
      }
      resolve(children);
    });
  }

  getChildren(element?: VirtualMachineTreeItem): Thenable<VirtualMachineTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      const allGroups = Provider.getConfiguration().virtualMachinesGroups;
      if (element === undefined) {
        const children = await this.drawRootGroupsItems();
        return resolve(children);
      } else {
        if (element.type === "VirtualMachine") {
          const children = await this.drawVirtualMachineItems(element);
          return resolve(children);
        } else if (element.type === "Snapshot") {
          const children = await this.drawSnapshotItems(element);
          return resolve(children);
        } else if (element.type === "Group") {
          const children = await this.drawGroupItems(element);
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

    dataTransfer.set("application/vnd.code.tree.virtualMachine", new vscode.DataTransferItem(source));
  }

  public async handleDrop(
    target: VirtualMachineTreeItem,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const itemsToTransfer: VirtualMachineTreeItem[] = [];

    const transferItem = dataTransfer.get("application/vnd.code.tree.virtualMachine");
    if (!transferItem) {
      return;
    }

    if (!Array.isArray(transferItem.value)) {
      itemsToTransfer.push(transferItem.value as VirtualMachineTreeItem);
    } else {
      itemsToTransfer.push(...(transferItem.value as VirtualMachineTreeItem[]));
    }

    itemsToTransfer.forEach(async item => {
      const treeItem = item as VirtualMachineTreeItem;

      if (target === undefined) {
        target = new VirtualMachineTreeItem(
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
          this.config.moveGroupToGroup(treeItem.id, targetGroup.uuid);
          break;
      }

      sourceGroup.removeVm(treeItem.name);
    });

    Provider.getConfiguration().save();
    this.refresh();
  }
}

// extract to separate file
