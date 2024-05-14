import * as vscode from "vscode";
import { FLAG_DEVOPS_CATALOG_HAS_ITEMS } from "../../constants/flags";
import { LogService } from "../../services/logService";

import { DevOpsCatalogTreeItem } from "./devops_catalog_tree_item";
import { AllDevOpsCatalogCommands } from "../commands/AllCommands";
import { DevOpsService } from "../../services/devopsService";
import { Provider } from "../../ioc/provider";

export class DevOpsCatalogProvider implements vscode.TreeDataProvider<DevOpsCatalogTreeItem> {
  data: DevOpsCatalogTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("parallels-desktop-catalog", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true
    });

    const config = Provider.getConfiguration();
    if (config.catalogProviders.length === 0) {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, false);
    } else {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, true);
    }

    context.subscriptions.push(view);

    AllDevOpsCatalogCommands.forEach(c => c.register(context, this));
  }

  getTreeItem(element: DevOpsCatalogTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<DevOpsCatalogTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DevOpsCatalogTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<DevOpsCatalogTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: DevOpsCatalogTreeItem): Thenable<DevOpsCatalogTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (!element) {
        const config = Provider.getConfiguration();
        const providers = config.allCatalogProviders;
        for (const provider of providers) {
          this.data.push(
            new DevOpsCatalogTreeItem(
              provider.ID,
              "",
              provider.name,
              "provider",
              provider.name,
              provider.rawHost,
              "devops.catalog.provider",
              provider.manifests.length === 0 ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
              "catalog_provider",
              provider
            )
          );
        }
        if (this.data.length > 0) {
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, true);
          DevOpsService.startCatalogViewAutoRefresh();
        }
      } else {
        switch (element.type) {
          case "provider":
            this.drawProviderManifests(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "manifest":
            this.drawProviderManifestVersions(element).then(() => {
              return resolve(this.data);
            });
            break;
          default:
            return resolve(this.data);
        }
      }

      return resolve(this.data);
    });
  }

  drawProviderManifests(element: DevOpsCatalogTreeItem): Thenable<DevOpsCatalogTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider") {
        const config = Provider.getConfiguration();
        const provider = config.findCatalogProviderByIOrName(element.id);
        if (provider) {
          for (const manifest of provider.manifests.sort((a, b) => a.name.localeCompare(b.name))) {
            let versions = "";
            let hasVersions = false;
            if (manifest.items) {
              versions = `${manifest.items.length.toString()} versions`;
              hasVersions = true;
            }
            this.data.push(
              new DevOpsCatalogTreeItem(
                `${element.id}%%${manifest.name}`,
                element.id,
                versions,
                "manifest",
                manifest.name,
                versions,
                "devops.catalog.manifest",
                hasVersions ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                "catalog_manifest",
                manifest
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawProviderManifestVersions(element: DevOpsCatalogTreeItem): Thenable<DevOpsCatalogTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "manifest") {
        const config = Provider.getConfiguration();
        const id = element.id.split("%%");
        const manifest = config.findCatalogProviderManifest(element.parentId, id[1]);
        if (manifest) {
          for (const version of manifest.items.sort((a, b) => a.name.localeCompare(b.name))) {
            this.data.push(
              new DevOpsCatalogTreeItem(
               `${id[0]}%%${manifest.name}%%${version.id}`,
                manifest.name,
                `${version.version} - ${version.architecture}`,
                "version",
                version.version,
                version.architecture,
                "devops.catalog.manifest.version",
                vscode.TreeItemCollapsibleState.None,
                "catalog_version",
                version
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }
}
