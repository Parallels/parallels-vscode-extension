import * as vscode from "vscode";
import * as uuid from "uuid";
import {VagrantBoxTreeItem} from "../treeItems/vagrantBoxItem";
import {VagrantService} from "../../services/vagrantService";
import {FLAG_NO_GROUP} from "../../constants/flags";
import {parallelsOutputChannel} from "../../helpers/channel";
import {LogService} from "../../services/logService";
import {AllVagrantCommands} from "../commands/AllCommands";

export class VagrantBoxProvider implements vscode.TreeDataProvider<VagrantBoxTreeItem> {
  data: VagrantBoxTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("parallels-desktop-vagrant", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true
    });
    context.subscriptions.push(view);

    AllVagrantCommands.forEach(c => c.register(context, this));
  }

  getTreeItem(element: VagrantBoxTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<VagrantBoxTreeItem | undefined | null | void> =
    new vscode.EventEmitter<VagrantBoxTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<VagrantBoxTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: VagrantBoxTreeItem): Thenable<VagrantBoxTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      VagrantService.getBoxes()
        .then(
          boxes => {
            boxes.forEach(box => {
              this.data.push(
                new VagrantBoxTreeItem(
                  "Box",
                  FLAG_NO_GROUP,
                  uuid.v4(),
                  box,
                  box,
                  "",
                  "vagrant.box",
                  vscode.TreeItemCollapsibleState.None,
                  "vagrant_boxes"
                )
              );
            });
            return resolve(this.data);
          },
          error => {
            LogService.error("Error getting vagrant boxes: " + error);
            return resolve([]);
          }
        )
        .catch(error => {
          LogService.error("Error getting vagrant boxes: " + error);
          return resolve([]);
        });
    });
  }
}
