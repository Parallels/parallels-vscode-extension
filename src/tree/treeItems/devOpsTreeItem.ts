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
      | "provider.remote_host.logs"
      | "provider.remote_host.host.info"
      | "provider.remote_host.host.logs"
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
      | "provider.remote_host.orchestrator.hosts.host.details"
      | "provider.remote_host.orchestrator.hosts.host.details.resources"
      | "provider.remote_host.orchestrator.hosts.host.details.reverse_proxy"
      | "provider.remote_host.orchestrator.hosts.host.details.info"
      | "provider.remote_host.orchestrator.hosts.host.details.virtual_machines"
      | "provider.remote_host.orchestrator.hosts.host.details.virtual_machines.virtual_machine"
      | "provider.remote_host.hosts"
      | "provider.remote_host.hosts.host"
      | "provider.remote_host.virtual_machines"
      | "provider.remote_host.virtual_machines.virtual_machine"
      | "provider.remote_host.resources.architecture"
      | "provider.remote_host.resources.system_reserved"
      | "provider.remote_host.resources.total"
      | "provider.remote_host.resources.used"
      | "provider.remote_host.resources.available"
      | "provider.remote_host.resources.reserved"
      | "provider.remote_host.host.virtual_machines"
      | "provider.remote_host.host.virtual_machines.virtual_machine"
      | "management"
      | "management.info"
      | "management.info.devops_version"
      | "management.info.architecture"
      | "management.info.cpu"
      | "management.info.os"
      | "management.info.os_version"
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
      | "management.role"
      | "management.catalog_provider.catalog.cache"
      | "management.catalog_provider.catalog.cache.manifests"
      | "management.catalog_provider.catalog.cache.manifests.manifest"
      | "management.catalog_provider.catalog.cache.manifests.manifest.version"
      | "management.remote_hosts.remote_host.catalog.cache"
      | "management.remote_hosts.remote_host.catalog.cache.manifests"
      | "management.remote_hosts.remote_host.catalog.cache.manifests.manifest"
      | "management.remote_hosts.remote_host.catalog.cache.manifests.manifest.version"
      | "management.remote_hosts.orchestrator.catalog.cache"
      | "management.remote_hosts.orchestrator.catalog.cache.manifests"
      | "management.remote_hosts.orchestrator.catalog.cache.manifests.manifest"
      | "management.remote_hosts.orchestrator.catalog.cache.manifests.manifest.version"
      | "management.remote_hosts.orchestrator.host.catalog.cache"
      | "management.remote_hosts.orchestrator.host.catalog.cache.manifests"
      | "management.remote_hosts.orchestrator.host.catalog.cache.manifests.manifest"
      | "management.remote_hosts.orchestrator.host.catalog.cache.manifests.manifest.version"
      | "management.catalog_provider.reverse_proxy"
      | "management.catalog_provider.reverse_proxy.hosts"
      | "management.catalog_provider.reverse_proxy.hosts.host"
      | "management.catalog_provider.reverse_proxy.hosts.host.tcp_route"
      | "management.catalog_provider.reverse_proxy.hosts.host.cors"
      | "management.catalog_provider.reverse_proxy.hosts.host.tls"
      | "management.catalog_provider.reverse_proxy.hosts.host.http_routes"
      | "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route"
      | "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details"
      | "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers"
      | "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers"
      | "management.remote_hosts.remote_host.reverse_proxy"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.tcp_route"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.cors"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.tls"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers"
      | "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers"
      | "management.remote_hosts.orchestrator.reverse_proxy"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.tcp_route"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.cors"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.tls"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers"
      | "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers"
      | "management.remote_hosts.orchestrator.host.reverse_proxy"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.tcp_route"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.cors"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.tls"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers"
      | "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers",
    label: string,
    public description: string,
    public className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider",
    context: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public iconName: string,
    public item?: DevOpsCatalogHostProvider | CatalogManifestItem | CatalogManifest,
    public command?: vscode.Command
  ) {
    let icon = undefined;
    if (iconName) {
      icon = {
        light: path.join(extensionContext.extensionPath, "img", "light", `${iconName}.svg`),
        dark: path.join(extensionContext.extensionPath, "img", "dark", `${iconName}.svg`)
      };
    }
    super(name, collapsibleState);
    this.parentId = parentId;
    this.name = name;
    this.type = type;
    this.iconPath = icon;
    if (label) {
      this.tooltip = label;
    }
    this.description = description;
    this.collapsibleState = collapsibleState;
    this.command = command;
    this.contextValue = context;
  }
}
