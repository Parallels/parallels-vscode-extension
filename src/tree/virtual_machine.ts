import * as vscode from "vscode";
import * as uuid from "uuid";
import {Commands} from "../helpers/commands";
import {Provider} from "../ioc/provider";
import {ParallelsVirtualMachineItem} from "./virtual_machine_item";
import {CommandsFlags, FLAG_NO_GROUP} from "../constants/flags";
import {registerAddGroupCommand} from "./commands/addGroup";
import {registerRemoveGroupCommand} from "./commands/removeGroup";
import {registerItemClickCommand} from "./commands/itemClick";
import {registerAddVirtualMachineCommand} from "./commands/addVirtualMachine";
import {registerStartVirtualMachineCommand} from "./commands/startVirtualMachine";
import {registerStopVirtualMachineCommand} from "./commands/stopVirtualMachine";
import {registerResumeVirtualMachineCommand} from "./commands/resumeVirtualMachine";
import {registerPauseVirtualMachineCommand} from "./commands/pauseVirtualMachine";
import {registerRefreshVirtualMachineCommand} from "./commands/refreshVirtualMachines";
import {registerStartHeadlessVirtualMachineCommand} from "./commands/startHeadlessVirtualMachine";

export class VirtualMachineProvider
  implements
    vscode.TreeDataProvider<ParallelsVirtualMachineItem>,
    vscode.TreeDragAndDropController<ParallelsVirtualMachineItem>
{
  dropMimeTypes = ["application/vnd.code.tree.virtualMachine"];
  dragMimeTypes = ["text/uri-list"];

  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("parallels-desktop", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: this
    });
    context.subscriptions.push(view);

    registerAddGroupCommand(context, this);
    registerRemoveGroupCommand(context, this);
    registerItemClickCommand(context, this);
    registerAddVirtualMachineCommand(context, this);
    registerStartVirtualMachineCommand(context, this);
    registerStartHeadlessVirtualMachineCommand(context, this);
    registerStopVirtualMachineCommand(context, this);
    registerResumeVirtualMachineCommand(context, this);
    registerPauseVirtualMachineCommand(context, this);
    registerRefreshVirtualMachineCommand(context, this);
  }

  data: ParallelsVirtualMachineItem[] = [];

  public on_item_clicked(item: ParallelsVirtualMachineItem) {
    console.log("on_item_clicked");
  }

  getTreeItem(element: ParallelsVirtualMachineItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<ParallelsVirtualMachineItem | undefined | null | void> =
    new vscode.EventEmitter<ParallelsVirtualMachineItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ParallelsVirtualMachineItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: ParallelsVirtualMachineItem): Thenable<ParallelsVirtualMachineItem[]> {
    return new Promise((resolve, reject) => {
      this.data = [];
      const groups = Provider.getConfiguration().virtualMachinesGroups;
      if (element === undefined) {
        groups.forEach(group => {
          if (group.name !== FLAG_NO_GROUP) {
            this.data.push(
              new ParallelsVirtualMachineItem(
                "Group",
                group.name,
                group.name,
                group.name,
                group.name,
                "",
                "group",
                group.machines.length > 0
                  ? vscode.TreeItemCollapsibleState.Collapsed
                  : vscode.TreeItemCollapsibleState.None,
                "desktop_group_new"
              )
            );
          }
        });
        const noGroup = groups.find(g => g.name === FLAG_NO_GROUP);
        if (noGroup !== undefined) {
          noGroup.machines.forEach(vm => {
            let icon = "desktop";
            if (vm.status === "running") {
              icon = "desktop_running";
            } else if (vm.status === "paused" || vm.status === "suspended") {
              icon = "desktop_paused";
            }
            this.data.push(
              new ParallelsVirtualMachineItem(
                "VirtualMachine",
                FLAG_NO_GROUP,
                vm.uuid,
                vm.name,
                vm.name,
                vm.status,
                `vm.${vm.status}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                icon,
                {command: CommandsFlags.treeViewItemClick, title: `Open ${vm.name}`, arguments: [vm]}
              )
            );
          });
        }
        return resolve(this.data);
      } else {
        console.log(`getChildren: ${element.label}`);
        if (element.type === "VirtualMachine") {
          Commands.getMachineSnapshot(element.id).then(
            snapshot => {
              const children: ParallelsVirtualMachineItem[] = [];
              if (snapshot.length === 0) {
                children.push(
                  new ParallelsVirtualMachineItem(
                    "Empty",
                    undefined,
                    uuid.v4(),
                    "No snapshots",
                    "No snapshots",
                    "",
                    "snapshot",
                    vscode.TreeItemCollapsibleState.None,
                    "images"
                  )
                );
              }
              snapshot.forEach(snap => {
                children.push(
                  new ParallelsVirtualMachineItem(
                    "Snapshot",
                    undefined,
                    snap.id,
                    snap.name,
                    snap.name,
                    snap.state,
                    `snapshot.${snap.state}`,
                    vscode.TreeItemCollapsibleState.None,
                    "images"
                  )
                );
              });
              resolve(children);
            },
            reject => {
              vscode.window.showErrorMessage(reject);
              console.log(reject);
            }
          );
        } else if (element.type === "Group") {
          const group = groups.find(g => g.name === element.id);
          if (group !== undefined) {
            group.machines.forEach(vm => {
              let icon = "desktop";
              if (vm.status === "running") {
                icon = "desktop_running";
              } else if (vm.status === "paused" || vm.status === "suspended") {
                icon = "desktop_paused";
              }
              this.data.push(
                new ParallelsVirtualMachineItem(
                  "VirtualMachine",
                  vm.group,
                  vm.uuid,
                  vm.name,
                  vm.name,
                  vm.status,
                  `vm.${vm.status}`,
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
    source: readonly ParallelsVirtualMachineItem[],
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
    target: ParallelsVirtualMachineItem,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<void> {
    const transferItem = dataTransfer.get("application/vnd.code.tree.virtualMachine");
    if (!transferItem) {
      return;
    }
    const vm = transferItem.value as ParallelsVirtualMachineItem;

    if (target === undefined) {
      target = new ParallelsVirtualMachineItem(
        "Group",
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

    targetGroup.add({
      uuid: vm.id,
      group: vm.group ?? "",
      name: vm.name,
      status: vm.status,
      ip_configured: "false"
    });

    sourceGroup.remove(vm.name);
    Provider.getConfiguration().save();
    this.refresh();
  }
}

// extract to separate file
