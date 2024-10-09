import * as vscode from "vscode";
import {CommandsFlags, FLAG_DEVOPS_CATALOG_HAS_ITEMS} from "../../constants/flags";

import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {AllDevOpsCatalogCommands} from "../commands/AllCommands";
import {DevOpsService} from "../../services/devopsService";
import {Provider} from "../../ioc/provider";
import {
  drawManagementItems,
  drawManagementUserItems,
  drawManagementUserSubItems,
  drawManagementUserItemClaims,
  drawManagementUserItemRoles,
  drawManagementClaims,
  drawManagementRoles,
  drawManagementInfoSubItems
} from "../devopsRemoteHostManagement/devopsManagementProvider";
import {cleanString} from "../../helpers/strings";
import {LogService} from "../../services/logService";

export class DevOpsCatalogProvider implements vscode.TreeDataProvider<DevOpsTreeItem> {
  data: DevOpsTreeItem[] = [];
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    AllDevOpsCatalogCommands.forEach(c => c.register(context, this));
    this.context = context;
    const view = vscode.window.createTreeView("parallels-desktop-remote-catalog", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: false
    });
    view.onDidChangeVisibility(e => {
      if (e.visible) {
        LogService.info("Starting Catalog View Auto Refresh", "DevOpsCatalogProvider");
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
        DevOpsService.startCatalogViewAutoRefresh();
      } else {
        LogService.info("Stopping Catalog View Auto Refresh", "DevOpsCatalogProvider");
        DevOpsService.stopCatalogViewAutoRefresh();
      }
    });

    const config = Provider.getConfiguration();
    if (!config.catalogProviders) {
      config.catalogProviders = [];
    }
    if (config.catalogProviders?.length === 0) {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, false);
    } else {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_HAS_ITEMS, true);
    }

    context.subscriptions.push(view);
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
      if (!element) {
        const config = Provider.getConfiguration();
        const providers = config.allCatalogProviders;
        for (const provider of providers) {
          const isSuperUser = provider?.user?.isSuperUser ?? false;
          const id = `${cleanString(provider.name).toLowerCase()}%%${provider.ID}`;
          let icon = "catalog_provider";
          switch (provider.state) {
            case "active":
              icon = `${icon}_active`;
              break;
            case "inactive":
              icon = `${icon}_inactive`;
              break;
          }
          this.data.push(
            new DevOpsTreeItem(
              this.context,
              id,
              "",
              provider.name,
              "provider.catalog",
              provider.name,
              provider.rawHost,
              "DevOpsCatalogHostProvider",
              "devops.catalog.provider",
              provider.manifests.length === 0 && !isSuperUser
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed,
              icon,
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
          case "provider.catalog":
            this.drawProviderSubItems(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests":
            this.drawProviderManifests(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest":
            this.drawProviderManifestVersions(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest.version":
            this.drawProviderManifestVersionSubItems(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest.architecture.roles":
            this.drawProviderManifestVersionRoleItems(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest.architecture.claims":
            this.drawProviderManifestVersionClaimItems(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest.architecture.tags":
            this.drawProviderManifestVersionTagItems(element).then(() => {
              return resolve(this.data);
            });
            break;
          case "provider.catalog.manifests.manifest.version.requirements":
            this.drawProviderManifestVersionRequirementsItems(element).then(() => {
              return resolve(this.data);
            });
            break;

          case "management":
            this.data = await drawManagementItems(this.context, element, this.data, "DevOpsCatalogHostProvider");
            return resolve(this.data);
          case "management.info":
            this.data = await drawManagementInfoSubItems(this.context, element, this.data, "DevOpsCatalogHostProvider");
            return resolve(this.data);
          case "management.users":
            this.data = await drawManagementUserItems(this.context, element, this.data, "DevOpsCatalogHostProvider");
            return resolve(this.data);
          case "management.user":
            this.data = await drawManagementUserSubItems(this.context, element, this.data, "DevOpsCatalogHostProvider");
            return resolve(this.data);
          case "management.user.claims":
            this.data = await drawManagementUserItemClaims(
              this.context,
              element,
              this.data,
              "DevOpsCatalogHostProvider"
            );
            return resolve(this.data);
          case "management.user.roles":
            this.data = await drawManagementUserItemRoles(
              this.context,
              element,
              this.data,
              "DevOpsCatalogHostProvider"
            );
            return resolve(this.data);
          case "management.claims":
            this.data = await drawManagementClaims(this.context, element, this.data, "DevOpsCatalogHostProvider");
            return resolve(this.data);
          case "management.roles":
            this.data = await drawManagementRoles(this.context, element, this.data, "DevOpsCatalogHostProvider");
            return resolve(this.data);
          default:
            return resolve(this.data);
        }
      }

      return resolve(this.data);
    });
  }

  drawProviderSubItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog") {
        const elementId = element.id.split("%%")[1];
        const provider = Provider.getConfiguration().findCatalogProviderByIOrName(elementId);
        const manifestsLength = provider?.manifests?.length ?? 0;
        const isSuperUser = provider?.user?.isSuperUser ?? false;
        if (isSuperUser) {
          this.data.push(
            new DevOpsTreeItem(
              this.context,
              `${elementId}%%management`,
              elementId,
              "Management",
              "management",
              "Management",
              "",
              "DevOpsCatalogHostProvider",
              "devops.remote.management",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_management"
            )
          );
        }
        this.data.push(
          new DevOpsTreeItem(
            this.context,
            `${elementId}%%manifest`,
            elementId,
            "Catalog Manifests",
            "provider.catalog.manifests",
            "Catalog Manifests",
            "",
            "DevOpsCatalogHostProvider",
            "devops.catalog.manifests",
            manifestsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "catalog_manifests"
          )
        );
      }

      return resolve(this.data);
    });
  }

  drawProviderManifests(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const provider = config.findCatalogProviderByIOrName(elementId);
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
                element.id,
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
      }

      return resolve(this.data);
    });
  }

  drawProviderManifestVersions(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
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

  drawProviderManifestVersionSubItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest.version") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const versionId = element.id.split("%%")[3];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
        if (!manifest) {
          return resolve(this.data);
        }
        const manifestItem = manifest?.items.find(i => i.id === versionId);
        const rolesLength = manifestItem?.required_roles?.length ?? 0;
        const claimsLength = manifestItem?.required_claims?.length ?? 0;
        const tagsLength = manifestItem?.tags?.length ?? 0;
        const context = "provider.catalog.manifests.manifest.architecture";
        const provider = config.findCatalogProviderByIOrName(elementId);
        const isSuperUser = provider?.user?.isSuperUser ?? false;
        if (
          manifestItem?.minimum_requirements !== undefined &&
          (manifestItem.minimum_requirements.cpu > 0 ||
            manifestItem.minimum_requirements.memory > 0 ||
            manifestItem.minimum_requirements.disk > 0)
        ) {
          this.data.push(
            new DevOpsTreeItem(
              this.context,
              `${element.id}%%requirements`,
              elementId,
              "Default Configuration",
              "provider.catalog.manifests.manifest.version.requirements",
              "Default Configuration",
              "",
              "DevOpsCatalogHostProvider",
              `${context}.requirements`,
              rolesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
              "info"
            )
          );
        }
        this.data.push(
          new DevOpsTreeItem(
            this.context,
            `${element.id}%%roles`,
            elementId,
            "Roles",
            "provider.catalog.manifests.manifest.architecture.roles",
            "Roles",
            "",
            "DevOpsCatalogHostProvider",
            isSuperUser ? `${context}.roles.super_user` : `${context}.roles`,
            rolesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_roles"
          )
        );

        this.data.push(
          new DevOpsTreeItem(
            this.context,
            `${element.id}%%claims`,
            elementId,
            "Claims",
            "provider.catalog.manifests.manifest.architecture.claims",
            "Claims",
            "",
            "DevOpsCatalogHostProvider",
            isSuperUser ? `${context}.claims.super_user` : `${context}.claims`,
            claimsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_claims"
          )
        );
        this.data.push(
          new DevOpsTreeItem(
            this.context,
            `${element.id}%%tags`,
            elementId,
            "Tags",
            "provider.catalog.manifests.manifest.architecture.tags",
            "Tags",
            "",
            "DevOpsCatalogHostProvider",
            isSuperUser ? `${context}.tags.super_user` : `${context}.tags`,
            tagsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "tags"
          )
        );
      }

      return resolve(this.data);
    });
  }

  drawProviderManifestVersionRoleItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest.architecture.roles") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const versionId = element.id.split("%%")[3];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
        if (!manifest) {
          return resolve(this.data);
        }
        const manifestItem = manifest?.items.find(i => i.id === versionId);
        if (manifestItem) {
          const provider = config.findCatalogProviderByIOrName(elementId);
          const isSuperUser = provider?.user?.isSuperUser ?? false;
          let context = "provider.catalog.manifests.manifest.architecture.role";
          if (isSuperUser) {
            context = `${context}.super_user`;
          }
          for (const role of manifestItem.required_roles?.sort((a, b) => a.localeCompare(b)) ?? []) {
            const id = `${element.id}%%roles%%${role}`;
            this.data.push(
              new DevOpsTreeItem(
                this.context,
                id,
                manifest.name,
                role,
                "provider.catalog.manifests.manifest.architecture.role",
                role,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_management_roles"
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawProviderManifestVersionClaimItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest.architecture.claims") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const versionId = element.id.split("%%")[3];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
        if (!manifest) {
          return resolve(this.data);
        }
        const manifestItem = manifest?.items.find(i => i.id === versionId);
        if (manifestItem) {
          const provider = config.findCatalogProviderByIOrName(elementId);
          const isSuperUser = provider?.user?.isSuperUser ?? false;
          let context = "provider.catalog.manifests.manifest.architecture.claim";
          if (isSuperUser) {
            context = `${context}.super_user`;
          }
          for (const claim of manifestItem.required_claims?.sort((a, b) => a.localeCompare(b)) ?? []) {
            const id = `${element.id}%%claims%%${claim}`;
            this.data.push(
              new DevOpsTreeItem(
                this.context,
                id,
                manifest.name,
                claim,
                "provider.catalog.manifests.manifest.architecture.claim",
                claim,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_management_claims"
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawProviderManifestVersionTagItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.catalog.manifests.manifest.architecture.tags") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const versionId = element.id.split("%%")[3];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
        if (!manifest) {
          return resolve(this.data);
        }
        const manifestItem = manifest?.items.find(i => i.id === versionId);
        if (manifestItem) {
          const provider = config.findCatalogProviderByIOrName(elementId);
          const isSuperUser = provider?.user?.isSuperUser ?? false;
          let context = "provider.catalog.manifests.manifest.architecture.tag";
          if (isSuperUser) {
            context = `${context}.super_user`;
          }
          for (const tag of manifestItem.tags?.sort((a, b) => a.localeCompare(b)) ?? []) {
            const id = `${element.id}%%tags%%${tag}`;
            this.data.push(
              new DevOpsTreeItem(
                this.context,
                id,
                manifest.name,
                tag,
                "provider.catalog.manifests.manifest.architecture.tag",
                tag,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                "tags"
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
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const versionId = element.id.split("%%")[3];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
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
        const elementId = element.id.split("%%")[0];
        const manifestId = element.id.split("%%")[2];
        const versionId = element.id.split("%%")[3];
        const manifest = config.findCatalogProviderManifest(elementId, manifestId);
        if (manifest) {
          for (const version of manifest.items.sort((a, b) => a.name.localeCompare(b.name))) {
            const icon = "info";
            const cpuText = version.minimum_requirements?.cpu ? `${version.minimum_requirements?.cpu} cpu cores` : "";
            const memoryText = version.minimum_requirements?.cpu
              ? `${Math.round(version.minimum_requirements?.memory / 1024)} Gb ram`
              : "";
            const diskSpaceText = version.minimum_requirements?.cpu
              ? `${Math.round(version.minimum_requirements?.disk / 1024)} Gb disk`
              : "";
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
            this.data.push(
              new DevOpsTreeItem(
                this.context,
                `${elementId}%%manifests%%${manifestId}%%${version.id}%%requirements%%disk`,
                "",
                "",
                "provider.catalog.manifests.manifest.version.requirements.items",
                diskSpaceText,
                "",
                "DevOpsCatalogHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_disk",
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
