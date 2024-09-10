import {CatalogManifest, CatalogManifestItem} from "../../models/devops/catalogManifest";
import path = require("path");
import * as vscode from "vscode";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";

export class DevOpsTreeItem extends vscode.TreeItem {
  constructor(
    public extensionContext: vscode.ExtensionContext,
    public id: string,
    public parentId: string,
    public name: string,
    public type:
      | "empty"
      | "provider.catalog"
      | "provider.catalog.manifests"
      | "provider.catalog.manifests.manifest"
      | "provider.catalog.manifests.manifest.version"
      | "provider.catalog.manifests.manifest.version.requirements"
      | "provider.catalog.manifests.manifest.version.requirements.items"
      | "provider.catalog.manifests.manifest.architecture"
      | "provider.catalog.manifests.manifest.architecture.roles"
      | "provider.catalog.manifests.manifest.architecture.role"
      | "provider.catalog.manifests.manifest.architecture.claims"
      | "provider.catalog.manifests.manifest.architecture.claim"
      | "provider.catalog.manifests.manifest.architecture.tags"
      | "provider.catalog.manifests.manifest.architecture.tag"
      | "provider.remote_host.orchestrator"
      | "provider.remote_host.host"
      | "provider.remote_host"
      | "provider.remote_host.host.hardware"
      | "provider.remote_host.host.resources"
      | "provider.remote_host.host.resources.architecture.system_reserved"
      | "provider.remote_host.host.resources.architecture.total"
      | "provider.remote_host.host.resources.architecture.used"
      | "provider.remote_host.host.resources.architecture.available"
      | "provider.remote_host.host.resources.architecture.reserved"
      | "provider.remote_host.orchestrator.resources"
      | "provider.remote_host.orchestrator.resources.architecture"
      | "provider.remote_host.orchestrator.resources.architecture.system_reserved"
      | "provider.remote_host.orchestrator.resources.architecture.total"
      | "provider.remote_host.orchestrator.resources.architecture.used"
      | "provider.remote_host.orchestrator.resources.architecture.available"
      | "provider.remote_host.orchestrator.resources.architecture.reserved"
      | "provider.remote_host.orchestrator.hosts"
      | "provider.remote_host.orchestrator.hosts.host"
      | "provider.remote_host.virtual_machines"
      | "provider.remote_host.virtual_machines.virtual_machine"
      | "management"
      | "management.info"
      | "management.info.devops_version"
      | "management.info.architecture"
      | "management.info.cpu"
      | "management.info.parallels_desktop_version"
      | "management.info.parallels_desktop_licensed"
      | "management.users"
      | "management.user"
      | "management.user.roles"
      | "management.user.role"
      | "management.user.claims"
      | "management.user.claim"
      | "management.claims"
      | "management.claim"
      | "management.roles"
      | "management.role",
    label: string,
    public description: string,
    public className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider",
    context: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public item?: DevOpsCatalogHostProvider | CatalogManifestItem | CatalogManifest,
    public command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.parentId = parentId;
    this.name = name;
    this.type = type;
    this.iconPath = {
      light: path.join(extensionContext.extensionPath, "img", "light", `${iconName}.svg`),
      dark: path.join(extensionContext.extensionPath, "img", "dark", `${iconName}.svg`)
    };
    this.label = label;
    this.description = description;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
