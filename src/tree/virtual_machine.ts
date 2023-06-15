import * as vscode from "vscode";
import * as uuid from "uuid";
import {Provider} from "../ioc/provider";
import {VirtualMachineTreeItem} from "./virtual_machine_item";
import {FLAG_NO_GROUP} from "../constants/flags";
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

export class VirtualMachineProvider
  implements vscode.TreeDataProvider<VirtualMachineTreeItem>, vscode.TreeDragAndDropController<VirtualMachineTreeItem>
{
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
    registerRemoveGroupCommand(context, this);
    registerViewVmDetailsCommand(context, this);
    registerAddVmCommand(context, this);
    registerStartVirtualMachineCommand(context, this);
    registerStartHeadlessVirtualMachineCommand(context, this);
    registerStopVirtualMachineCommand(context, this);
    registerResumeVirtualMachineCommand(context, this);
    registerPauseVirtualMachineCommand(context, this);
    registerSuspendVirtualMachineCommand(context, this);
    registerRefreshVirtualMachineCommand(context, this);
    registerTakeSnapshotCommand(context, this);
    registerDeleteVmSnapshotCommand(context, this);
    registerRestoreVmSnapshotCommand(context, this);
    registerStopGroupVirtualMachinesCommand(context, this);
    registerStartGroupVirtualMachinesCommand(context, this);
    registerPauseGroupVirtualMachinesCommand(context, this);
    registerResumeGroupVirtualMachinesCommand(context, this);
    registerSuspendGroupVirtualMachinesCommand(context, this);
    registerTakeGroupSnapshotCommand(context, this);
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

  getChildren(element?: VirtualMachineTreeItem): Thenable<VirtualMachineTreeItem[]> {
    return new Promise((resolve, reject) => {
      this.data = [];
      const groups = Provider.getConfiguration().virtualMachinesGroups;
      if (element === undefined) {
        groups.forEach(group => {
          if (group.name !== FLAG_NO_GROUP) {
            let groupState = "unknown";
            group.machines.forEach(vm => {
              if (groupState === "unknown") {
                groupState = vm.State;
              } else {
                if (groupState !== vm.State) {
                  groupState = "mixed";
                }
              }
            });
            let icon = "desktop_group_new";
            if (groupState === "running") {
              icon = "desktop_group_new_running";
            } else if (groupState === "paused" || groupState === "suspended") {
              icon = "desktop_group_new_paused";
            }
            this.data.push(
              new VirtualMachineTreeItem(
                group,
                "Group",
                group.name,
                group.name,
                undefined,
                group.name,
                group.name,
                "",
                `group.${groupState}`,
                group.machines.length > 0
                  ? vscode.TreeItemCollapsibleState.Collapsed
                  : vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        });
        const noGroup = groups.find(g => g.name === FLAG_NO_GROUP);
        if (noGroup !== undefined) {
          noGroup.machines.forEach(vm => {
            let icon = "desktop";
            if (vm.State === "running") {
              icon = "desktop_running";
            } else if (vm.State === "paused" || vm.State === "suspended") {
              icon = "desktop_paused";
            }
            this.data.push(
              new VirtualMachineTreeItem(
                vm,
                "VirtualMachine",
                FLAG_NO_GROUP,
                vm.ID,
                vm.ID,
                vm.Name,
                vm.Name,
                vm.State,
                `vm.${vm.State}`,
                vm.OS === "macosx" ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
                icon
              )
            );
          });
        }
        return resolve(this.data);
      } else {
        console.log(`getChildren: ${element.label}`);
        if (element.type === "VirtualMachine") {
          const children: VirtualMachineTreeItem[] = [];
          ParallelsDesktopService.getVmSnapshots(element.id)
            .then(
              snapshot => {
                if (snapshot.length === 0) {
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
                      "images"
                    )
                  );
                }
                snapshot
                  .filter(f => f.parent === undefined || f.parent === "")
                  .forEach(snap => {
                    const hasChildren = snapshot.filter(f => f.parent === snap.id)?.length > 0;
                    children.push(
                      new VirtualMachineTreeItem(
                        element.item,
                        "Snapshot",
                        undefined,
                        snap.id,
                        (element.item as VirtualMachine).ID ?? undefined,
                        snap.name,
                        snap.name,
                        snap.state,
                        `snapshot.${snap.current ? "current" : "other"}`,
                        hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        snap.current ? "images_current" : "images"
                      )
                    );
                  });
                resolve(children);
              },
              reject => {
                vscode.window.showErrorMessage(`Failed to get snapshots for ${element.label}, reason: ${reject}`);
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
              vscode.window.showErrorMessage(`Failed to get snapshots for ${element.label}, reason: ${reason}`);
              parallelsOutputChannel.appendLine(reason);
            });
        } else if (element.type === "Snapshot") {
          const children: VirtualMachineTreeItem[] = [];
          ParallelsDesktopService.getVmSnapshots(element.vmId ?? "")
            .then(
              snapshot => {
                if (snapshot.length === 0) {
                  children.push(
                    new VirtualMachineTreeItem(
                      undefined,
                      "Empty",
                      undefined,
                      uuid.v4(),
                      element.vmId,
                      "No snapshots",
                      "No snapshots",
                      "",
                      "snapshot",
                      vscode.TreeItemCollapsibleState.None,
                      "images"
                    )
                  );
                }
                snapshot
                  .filter(f => f.parent === element.id)
                  .forEach(snap => {
                    const hasChildren = snapshot.filter(f => f.parent === snap.id)?.length > 0;
                    children.push(
                      new VirtualMachineTreeItem(
                        element.item,
                        "Snapshot",
                        undefined,
                        snap.id,
                        element.vmId,
                        snap.name,
                        snap.name,
                        snap.state,
                        `snapshot.${snap.current ? "current" : "other"}`,
                        hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        snap.current ? "images_current" : "images"
                      )
                    );
                  });
                resolve(children);
              },
              reject => {
                vscode.window.showErrorMessage(`Failed to get snapshots for ${element.label}, reason: ${reject}`);
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
              vscode.window.showErrorMessage(`Failed to get snapshots for ${element.label}, reason: ${reason}`);
              parallelsOutputChannel.appendLine(reason);
            });
        } else if (element.type === "Group") {
          const group = groups.find(g => g.name === element.id);
          if (group !== undefined) {
            group.machines.forEach(vm => {
              let icon = "desktop";
              if (vm.State === "running") {
                icon = "desktop_running";
              } else if (vm.State === "paused" || vm.State === "suspended") {
                icon = "desktop_paused";
              }
              this.data.push(
                new VirtualMachineTreeItem(
                  vm,
                  "VirtualMachine",
                  vm.group,
                  vm.ID,
                  vm.ID,
                  vm.Name,
                  vm.Name,
                  vm.State,
                  `vm.${vm.State}`,
                  vscode.TreeItemCollapsibleState.Collapsed,
                  icon
                )
              );
            });
          }
          resolve(this.data);
        }
      }
    });
  }

  public async handleDrag(
    source: readonly VirtualMachineTreeItem[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    console.log(source, dataTransfer, token);
    if (source.length === 1) {
      dataTransfer.set("application/vnd.code.tree.virtualMachine", new vscode.DataTransferItem(source[0]));
    } else {
      token.isCancellationRequested = true;
    }
    // dataTransfer.set("application/vnd.code.tree.testViewDragAndDrop", JSON.stringify(source)
  }

  public async handleDrop(
    target: VirtualMachineTreeItem,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const transferItem = dataTransfer.get("application/vnd.code.tree.virtualMachine");
    if (!transferItem) {
      return;
    }
    const vm = transferItem.value as VirtualMachineTreeItem;

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

    const groups = Provider.getConfiguration().virtualMachinesGroups;
    const targetGroup = groups.find(g => g.name === target.id);
    const sourceGroup = groups.find(g => g.name === vm.group);
    if (targetGroup === undefined) {
      return;
    }
    if (sourceGroup === undefined) {
      return;
    }

    targetGroup.add(vm.item as VirtualMachine);

    sourceGroup.remove(vm.name);
    Provider.getConfiguration().save();
    this.refresh();
  }
}

// extract to separate file
