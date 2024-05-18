import * as vscode from "vscode";
import { FLAG_DEVOPS_CATALOG_HAS_ITEMS } from "../../constants/flags";
import { LogService } from "../../services/logService";

import { DevOpsTreeItem } from "../treeItems/devOpsTreeItem";
import { AllDevOpsCatalogCommands, AllDevopsRemoteProviderManagementCommands } from "../commands/AllCommands";
import { DevOpsService } from "../../services/devopsService";
import { Provider } from "../../ioc/provider";
import { drawManagementItems, drawManagementUserItems, drawManagementUserSubItems, drawManagementUserItemClaims, drawManagementUserItemRoles, drawManagementClaims, drawManagementRoles } from "../devopsRemoteHostManagement/devopsManagementProvider";
import { cleanString } from "../../helpers/strings";

export class DevOpsCatalogProvider implements vscode.TreeDataProvider<DevOpsTreeItem> {
  data: DevOpsTreeItem[] = [];

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

  getTreeItem(element: DevOpsTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<DevOpsTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DevOpsTreeItem | undefined | null | void>();

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
          const id = `${cleanString(provider.name).toLowerCase()}%%${provider.ID}`
          let icon = "catalog_provider"
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
              id,
              "",
              provider.name,
              "provider.catalog",
              provider.name,
              provider.rawHost,
              "DevOpsCatalogHostProvider",
              "devops.catalog.provider",
              provider.manifests.length === 0 ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
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

          case "management":
            this.data = await drawManagementItems(element, this.data, "DevOpsCatalogHostProvider")
            return resolve(this.data);
          case "management.users":
            this.data = await drawManagementUserItems(element, this.data, "DevOpsCatalogHostProvider")
            return resolve(this.data);
          case "management.user":
            this.data = await drawManagementUserSubItems(element, this.data, "DevOpsCatalogHostProvider")
            return resolve(this.data);
          case "management.user.claims":
            this.data = await drawManagementUserItemClaims(element, this.data,"DevOpsCatalogHostProvider")
            return resolve(this.data);
          case "management.user.roles":
            this.data = await drawManagementUserItemRoles(element, this.data,"DevOpsCatalogHostProvider")
            return resolve(this.data);
          case "management.claims":
            this.data = await drawManagementClaims(element, this.data,"DevOpsCatalogHostProvider")
            return resolve(this.data);
          case "management.roles":
            this.data = await drawManagementRoles(element, this.data,"DevOpsCatalogHostProvider")
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
            let icon = "catalog_manifest"
            const hasTainted = manifest.items.some(i => i.tainted);
            const hasRevoked = manifest.items.some(i => i.revoked);
            if (hasTainted || hasRevoked) {
              icon = `${icon}_has_issues`;
            }
            this.data.push(
              new DevOpsTreeItem(
                `${elementId}%%manifests%%${manifest.name}`,
                element.id,
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
            let icon = "catalog_version"
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
            let tooltip = version.version;
            if (version.tainted) {
                tooltip = `${tooltip} - Tainted by ${version.tainted_by} on ${new Date(version.tainted_at ??"").toLocaleDateString()}`;
            }
            if (version.revoked) {
              tooltip = `${tooltip} - Revoked by ${version.revoked_by} on ${new Date(version.revoked_at ??"").toLocaleDateString()}`;
            }
            let description = version.architecture ?? "";
            const downloadCount = version.download_count ?? 0;
            if (downloadCount ?? 0 > 0) {
              description = `${description} - ${version.download_count} downloads`;
            }

            this.data.push(
              new DevOpsTreeItem(
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
        this.data.push(
          new DevOpsTreeItem(
            `${element.id}%%roles`,
            elementId,
            "Roles",
            "provider.catalog.manifests.manifest.architecture.roles",
            "Roles",
            "",
            "DevOpsCatalogHostProvider",
            "provider.catalog.manifests.manifest.architecture.roles",
            rolesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_roles"
          )
        );

        this.data.push(
          new DevOpsTreeItem(
            `${element.id}%%claims`,
            elementId,
            "Claims",
            "provider.catalog.manifests.manifest.architecture.claims",
            "Claims",
            "",
            "DevOpsCatalogHostProvider",
            "provider.catalog.manifests.manifest.architecture.claims",
            claimsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_claims"
          )
        );
        this.data.push(
          new DevOpsTreeItem(
            `${element.id}%%tags`,
            elementId,
            "Tags",
            "provider.catalog.manifests.manifest.architecture.tags",
            "Tags",
            "",
            "DevOpsCatalogHostProvider",
            "provider.catalog.manifests.manifest.architecture.tags",
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
          for (const role of manifestItem.required_roles?.sort((a, b) => a.localeCompare(b)) ?? []) {
            const id = `${element.id}%%roles%%${role}`;
            this.data.push(
              new DevOpsTreeItem(
                id,
                manifest.name,
                role,
                "provider.catalog.manifests.manifest.architecture.role",
                role,
                "",
                "DevOpsCatalogHostProvider",
                "provider.catalog.manifests.manifest.architecture.role",
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_management_roles",
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
          for (const claim of manifestItem.required_claims?.sort((a, b) => a.localeCompare(b)) ?? []) {
            const id = `${element.id}%%claims%%${claim}`;
            this.data.push(
              new DevOpsTreeItem(
                id,
                manifest.name,
                claim,
                "provider.catalog.manifests.manifest.architecture.claim",
                claim,
                "",
                "DevOpsCatalogHostProvider",
                "provider.catalog.manifests.manifest.architecture.claim",
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_management_claims",
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
          for (const tag of manifestItem.tags?.sort((a, b) => a.localeCompare(b)) ?? []) {
            const id = `${element.id}%%tags%%${tag}`;
            this.data.push(
              new DevOpsTreeItem(
                id,
                manifest.name,
                tag,
                "provider.catalog.manifests.manifest.architecture.tag",
                tag,
                "",
                "DevOpsCatalogHostProvider",
                "provider.catalog.manifests.manifest.architecture.tag",
                vscode.TreeItemCollapsibleState.None,
                "tags",
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }
}
