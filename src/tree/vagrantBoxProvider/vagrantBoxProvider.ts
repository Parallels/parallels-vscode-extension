import {VagrantBoxRefreshCommand} from "./../commands/vagrant/vagrantBoxesRefresh";
import * as vscode from "vscode";
import * as uuid from "uuid";
import {VagrantBoxTreeItem} from "../treeItems/vagrantBoxItem";
import {VagrantService} from "../../services/vagrantService";
import {CommandsFlags, FLAG_AUTO_REFRESH, FLAG_AUTO_REFRESH_INTERVAL, FLAG_NO_GROUP} from "../../constants/flags";
import {LogService} from "../../services/logService";
import {AllVagrantCommands} from "../commands/AllCommands";
import {Provider} from "../../ioc/provider";

let autoRefreshVagrantBoxesInterval: NodeJS.Timeout | undefined;
let isAutoRefreshVagrantBoxesRunning = false;

export class VagrantBoxProvider implements vscode.TreeDataProvider<VagrantBoxTreeItem> {
  data: VagrantBoxTreeItem[] = [];
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const view = vscode.window.createTreeView("parallels-desktop-vagrant", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: false
    });

    view.onDidChangeVisibility(e => {
      if (e.visible) {
        LogService.info("Starting auto refresh for vagrant boxes", "VagrantBoxProvider");
        startVagrantBoxesAutoRefresh();
        vscode.commands.executeCommand(CommandsFlags.vagrantProviderRefresh);
      } else {
        LogService.info("Stopping auto refresh for vagrant boxes", "VagrantBoxProvider");
        stopVagrantBoxesAutoRefresh();
      }
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
                  this.context,
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

export function startVagrantBoxesAutoRefresh() {
  if (isAutoRefreshVagrantBoxesRunning) {
    LogService.info("Auto refresh is already running, skipping...", "CoreService");
    return;
  }

  isAutoRefreshVagrantBoxesRunning = true;
  const settings = Provider.getSettings();
  const cfg = Provider.getConfiguration();
  const autoRefresh = settings.get<boolean>(FLAG_AUTO_REFRESH);
  clearInterval(autoRefreshVagrantBoxesInterval);
  if (autoRefresh) {
    LogService.info("Auto refresh is enabled", "VagrantBoxProvider");
    let interval = settings.get<number>(FLAG_AUTO_REFRESH_INTERVAL);
    if (interval === undefined) {
      LogService.info("Auto refresh interval is not defined, setting default to 60 seconds", "VagrantBoxProvider");
      settings.update(FLAG_AUTO_REFRESH_INTERVAL, 60000);
      interval = 60000;
    }
    if (interval < 10000) {
      LogService.info("Auto refresh interval is too low, setting minimum to 10 seconds", "VagrantBoxProvider");
      settings.update(FLAG_AUTO_REFRESH_INTERVAL, 10000);
      interval = 10000;
    }

    LogService.info("Auto refresh interval is " + interval + "ms", "VagrantBoxProvider");
    clearInterval(autoRefreshVagrantBoxesInterval);
    autoRefreshVagrantBoxesInterval = setInterval(() => {
      LogService.info("Refreshing the virtual machine tree view", "VagrantBoxProvider");
      vscode.commands.executeCommand(CommandsFlags.vagrantProviderRefresh);
    }, interval);
  } else {
    if (autoRefreshVagrantBoxesInterval) {
      LogService.info("Clearing the auto refresh interval", "VagrantBoxProvider");
      clearInterval(autoRefreshVagrantBoxesInterval);
    }
    LogService.info("Auto refresh is disabled", "VagrantBoxProvider");
  }

  isAutoRefreshVagrantBoxesRunning = false;
}

export function stopVagrantBoxesAutoRefresh() {
  clearInterval(autoRefreshVagrantBoxesInterval);
}
