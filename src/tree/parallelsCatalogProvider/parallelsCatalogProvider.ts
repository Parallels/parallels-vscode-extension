import * as vscode from "vscode";
import {FLAG_PARALLELS_CATALOG_HAS_ITEMS} from "../../constants/flags";

import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {Provider} from "../../ioc/provider";
import {AllParallelsCommands} from "../commands/AllCommands";

export class ParallelsCatalogProvider implements vscode.TreeDataProvider<DevOpsTreeItem> {
  data: DevOpsTreeItem[] = [];
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const view = vscode.window.createTreeView("parallels-desktop-catalog", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true
    });

    const config = Provider.getConfiguration();
    if (config.parallelsCatalogProvider.manifests?.length === 0) {
      vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_HAS_ITEMS, false);
    } else {
      vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_HAS_ITEMS, true);
    }

    context.subscriptions.push(view);

    AllParallelsCommands.forEach(c => c.register(context, this));
  }

  getTreeItem(element: DevOpsTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<DevOpsTreeItem | undefined | null | void> = new vscode.EventEmitter<
    DevOpsTreeItem | undefined | null | void
  >();

  readonly onDidChangeTreeData: vscode.Event<DevOpsTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      const config = Provider.getConfiguration();
      if (config.license_edition !== "pro" && config.license_edition !== "business") {
        return resolve(this.data);
      }
      if (!element) {
        const config = Provider.getConfiguration();
        const id = `parallels-desktop-vms-catalog`;
        // let icon = "catalog_provider";
        this.drawProviderManifests().then(() => {
          return resolve(this.data);
        });
      } else {
        switch (element.type) {
          case "provider.catalog.manifests.manifest":
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

  drawProviderManifests(): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      const config = Provider.getConfiguration();
      const elementId = "parallels-desktop-vms-catalog";
      const provider = config.parallelsCatalogProvider;
      if (provider) {
        for (const manifest of provider.manifests.sort((a, b) => a.name.localeCompare(b.name))) {
          let versions = "";
          let hasVersions = false;
          if (manifest.items) {
            versions = `${manifest.items.length.toString()} versions`;
            hasVersions = true;
          }
          let icon = "catalog_manifest";
          const hasTainted = manifest.items.some(i => i.tainted);
          const hasRevoked = manifest.items.some(i => i.revoked);
          if (hasTainted || hasRevoked) {
            icon = `${icon}_has_issues`;
          }
          this.data.push(
            new DevOpsTreeItem(
              this.context,
              `${elementId}%%manifests%%${manifest.name}`,
              elementId,
              versions,
              "provider.catalog.manifests.manifest",
              manifest.name,
              versions,
              "DevOpsCatalogHostProvider",
              "devops.catalog.manifests.manifest",
              hasVersions ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
              icon,
              manifest
            )
          );
        }
      }

      return resolve(this.data);
    });
  }

  drawProviderManifestVersions(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest") {
        const config = Provider.getConfiguration();
        const provider = config.parallelsCatalogProvider;
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const manifest = provider?.manifests.find(i => i.name === manifestId);
        if (manifest) {
          for (const version of manifest.items.sort((a, b) => a.name.localeCompare(b.name))) {
            let icon = "catalog_version";
            if (version.tainted) {
              icon = `${icon}_tainted`;
            }
            if (version.revoked) {
              icon = `${icon}_revoked`;
            }
            let context = "devops.catalog.manifests.manifest.version";
            if (version.tainted) {
              context = "devops.catalog.manifests.manifest.version.tainted";
            }
            if (version.revoked) {
              context = "devops.catalog.manifests.manifest.version.revoked";
            }
            const provider = config.findCatalogProviderByIOrName(elementId);
            const isSuperUser = provider?.user?.isSuperUser ?? false;
            if (isSuperUser) {
              context = `${context}.super_user`;
            }

            let tooltip = version.version;
            if (version.tainted) {
              tooltip = `${tooltip} - Tainted by ${version.tainted_by} on ${new Date(
                version.tainted_at ?? ""
              ).toLocaleDateString()}`;
            }
            if (version.revoked) {
              tooltip = `${tooltip} - Revoked by ${version.revoked_by} on ${new Date(
                version.revoked_at ?? ""
              ).toLocaleDateString()}`;
            }
            let description = version.architecture ?? "";
            const downloadCount = version.download_count ?? 0;
            if (downloadCount ?? 0 > 0) {
              description = `${description} - ${version.download_count} downloads`;
            }

            this.data.push(
              new DevOpsTreeItem(
                this.context,
                `${elementId}%%manifests%%${manifestId}%%${version.id}`,
                manifest.name,
                `${version.version} - ${version.architecture}`,
                "provider.catalog.manifests.manifest.version",
                tooltip,
                description,
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                icon,
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
