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
          case "provider.catalog.manifests.manifest.version":
            this.drawProviderManifestVersionRequirements(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest.version.requirements":
            this.drawProviderManifestVersionRequirementsItems(element).then(() => {
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
          if (
            manifest.name.toLowerCase().startsWith("ai_development") ||
            manifest.name.toLowerCase().startsWith("ai-development")
          ) {
            icon = "parallels_catalog_ai_vm";
          }
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
              manifest.description ? manifest.description : manifest.name,
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
            const description = version.architecture ?? "";

            const expanded = version.minimum_requirements
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.None;

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
                expanded,
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

  drawProviderManifestVersionRequirements(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest.version") {
        const config = Provider.getConfiguration();
        const provider = config.parallelsCatalogProvider;
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const manifest = provider?.manifests.find(i => i.name === manifestId);
        if (manifest) {
          for (const version of manifest.items.sort((a, b) => a.name.localeCompare(b.name))) {
            const icon = "info";
            const tooltip = "Default Configuration";
            const context = "devops.catalog.manifests.manifest.version.requirements";

            this.data.push(
              new DevOpsTreeItem(
                this.context,
                `${elementId}%%manifests%%${manifestId}%%${version.id}%%requirements`,
                "",
                "",
                "provider.catalog.manifests.manifest.version.requirements",
                tooltip,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.Collapsed,
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

  drawProviderManifestVersionRequirementsItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest.version.requirements") {
        const config = Provider.getConfiguration();
        const provider = config.parallelsCatalogProvider;
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const manifest = provider?.manifests.find(i => i.name === manifestId);
        if (manifest) {
          for (const version of manifest.items.sort((a, b) => a.name.localeCompare(b.name))) {
            const icon = "info";
            const cpuText = version.minimum_requirements?.cpu
              ? `${version.minimum_requirements?.cpu} CPU core${version.minimum_requirements?.cpu > 1 ? "s" : ""}`
              : "";
            const memoryText = version.minimum_requirements?.memory
              ? `${Math.round(version.minimum_requirements?.memory / 1024)} GB${
                  version.minimum_requirements?.memory / 1024 > 1 ? "s" : ""
                } RAM`
              : "";
            // const diskSpaceText = version.minimum_requirements?.disk
            //   ? `${Math.round(version.minimum_requirements?.disk / 1024)} GB${
            //       version.minimum_requirements?.disk / 1024 > 1 ? "s" : ""
            //     } disk`
            //   : "";
            const context = "devops.catalog.manifests.manifest.version.requirements.items";

            this.data.push(
              new DevOpsTreeItem(
                this.context,
                `${elementId}%%manifests%%${manifestId}%%${version.id}%%requirements%%cpu`,
                "",
                "",
                "provider.catalog.manifests.manifest.version.requirements.items",
                cpuText,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_cpu",
                version
              )
            );
            this.data.push(
              new DevOpsTreeItem(
                this.context,
                `${elementId}%%manifests%%${manifestId}%%${version.id}%%requirements%%memory`,
                "",
                "",
                "provider.catalog.manifests.manifest.version.requirements.items",
                memoryText,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_memory",
                version
              )
            );
            // this.data.push(
            //   new DevOpsTreeItem(
            //     this.context,
            //     `${elementId}%%manifests%%${manifestId}%%${version.id}%%requirements%%disk`,
            //     "",
            //     "",
            //     "provider.catalog.manifests.manifest.version.requirements.items",
            //     diskSpaceText,
            //     "",
            //     "DevOpsCatalogHostProvider",
            //     context,
            //     vscode.TreeItemCollapsibleState.None,
            //     "remote_hosts_provider_orchestrator_resources_disk",
            //     version
            //   )
            // );
          }
        }
      }

      return resolve(this.data);
    });
  }
}
