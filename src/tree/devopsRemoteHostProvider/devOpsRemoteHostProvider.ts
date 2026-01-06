import * as vscode from "vscode";
import {CommandsFlags, FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS} from "../../constants/flags";
import {AllDevOpsRemoteCommands} from "../commands/AllCommands";
import {DevOpsService} from "../../services/devopsService";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
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
import {
  drawOrchestratorHostsItems,
  drawOrchestratorHostsHostItems,
  drawOrchestratorResourcesArchitecture,
  drawOrchestratorResourcesArchitectureResource,
  drawOrchestratorResources
} from "./orchestrator_hosts";
import {
  drawHostResourcesItems,
  drawHostResourcesItemsValues,
  drawHostVirtualMachine,
  drawHostVirtualMachines
} from "./host";
import {drawRemoteHostItems} from "./remote_host";
import {drawHostInfo} from "../devopsRemoteHostManagement/information";
import {
  drawHostCatalogCache,
  drawHostCatalogCacheItemDetails,
  drawHostCatalogCacheItems
} from "../devopsRemoteHostManagement/catalog_cache";
import {
  drawReverseProxy,
  drawReverseProxyHosts,
  drawReverseProxyHostsHost,
  drawReverseProxyHostsHostHttpRoutesCors,
  drawReverseProxyHostsHostHttpRoutesHttpRoute,
  drawReverseProxyHostsHostHttpRoutesHttpRouteDetails,
  drawReverseProxyHostsHostHttpRoutesHttpRouteDetailsRequestHeaders,
  drawReverseProxyHostsHostHttpRoutesHttpRouteDetailsResponseHeaders,
  drawReverseProxyHostsHostHttpRoutesTls,
  drawReverseProxyHostsHostTcpRoute
} from "../devopsRemoteHostManagement/reverse_proxy";

export class DevOpsRemoteHostsProvider implements vscode.TreeDataProvider<DevOpsTreeItem> {
  data: DevOpsTreeItem[] = [];
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const view = vscode.window.createTreeView("parallels-desktop-remote-hosts", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: false
    });

    view.onDidChangeVisibility(e => {
      if (e.visible) {
        LogService.info("Starting Remote Hosts View Auto Refresh", "DevOpsRemoteHostsProvider");
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
        DevOpsService.startRemoteHostsViewAutoRefresh();
        // Send telemetry event
        const telemetry = Provider.telemetry();
        telemetry.sendHeartbeat();
      } else {
        LogService.info("Stopping Remote Hosts View Auto Refresh", "DevOpsRemoteHostsProvider");
        DevOpsService.stopRemoteHostsViewAutoRefresh();
      }
    });

    const config = Provider.getConfiguration();
    if (!config.remoteHostProviders) {
      config.remoteHostProviders = [];
    }

    if (config.remoteHostProviders?.length === 0) {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, false);
    } else {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, true);
    }

    context.subscriptions.push(view);

    AllDevOpsRemoteCommands.forEach(c => c.register(context, this));
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
        const providers = config.allRemoteHostProviders;
        for (const provider of providers) {
          const isSuperUser = provider?.user?.isSuperUser ?? false;
          const id = `${cleanString(provider.name).toLowerCase()}%%${provider.ID}`;
          let icon =
            provider.type === "orchestrator" ? "remote_hosts_provider_orchestrator" : "remote_hosts_provider_host";

          // Check if orchestrator has WebSocket capability
          const hasWebSocketCapability =
            provider.type === "orchestrator" && provider.hosts?.some(host => host.has_websocket_events === true);

          switch (provider.state) {
            case "active":
              icon = `${icon}_active`;
              break;
            case "inactive":
              icon = `${icon}_inactive`;
              break;
          }

          // Add websocket suffix if capable
          if (hasWebSocketCapability) {
            icon = `${icon}_websocket`;
          }

          let collapsible =
            provider.virtualMachines.length === 0 && !isSuperUser
              ? vscode.TreeItemCollapsibleState.None
              : vscode.TreeItemCollapsibleState.Collapsed;
          if (provider.type === "orchestrator") {
            collapsible = vscode.TreeItemCollapsibleState.Collapsed;
          }
          if (provider.state === "inactive") {
            collapsible = vscode.TreeItemCollapsibleState.None;
          }
          this.data.push(
            new DevOpsTreeItem(
              this.context,
              id,
              "",
              provider.name,
              provider.type === "orchestrator" ? "provider.remote_host.orchestrator" : "provider.remote_host.host",
              provider.name,
              provider.rawHost,
              "DevOpsRemoteHostProvider",
              `devops.remote.provider.${provider.state}`,
              collapsible,
              icon
            )
          );
        }

        if (this.data.length > 0) {
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, true);
          if (!DevOpsService.isRemoteHostsViewAutoRefreshStarted()) {
            DevOpsService.startRemoteHostsViewAutoRefresh();
          }
        }
        resolve(this.data);
      } else {
        switch (element.type) {
          case "provider.remote_host.orchestrator":
          case "provider.remote_host.host":
            this.data = await drawRemoteHostItems(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.host.info":
            this.data = await drawHostInfo(this.context, this.data, element, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "provider.remote_host.virtual_machines":
          case "provider.remote_host.host.virtual_machines":
            this.data = await drawHostVirtualMachines(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.virtual_machines.virtual_machine":
          case "provider.remote_host.host.virtual_machines.virtual_machine":
            this.data = await drawHostVirtualMachine(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.hosts":
            this.data = await drawOrchestratorHostsItems(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.hosts.host":
            this.data = await drawOrchestratorHostsHostItems(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.orchestrator.hosts.host.details.info":
            this.data = await drawHostInfo(this.context, this.data, element, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "provider.remote_host.host.resources":
            this.data = await drawHostResourcesItems(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.orchestrator.hosts.host.details.resources":
            this.data = await drawHostResourcesItems(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.orchestrator.resources":
            this.data = await drawOrchestratorResources(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.orchestrator.resources.architecture":
            this.data = await drawOrchestratorResourcesArchitecture(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.orchestrator.resources.architecture.system_reserved":
          case "provider.remote_host.orchestrator.resources.architecture.total":
          case "provider.remote_host.orchestrator.resources.architecture.available":
          case "provider.remote_host.orchestrator.resources.architecture.used":
          case "provider.remote_host.orchestrator.resources.architecture.reserved":
            this.data = await drawOrchestratorResourcesArchitectureResource(this.context, this.data, element);
            return resolve(this.data);
          case "provider.remote_host.resources.system_reserved":
          case "provider.remote_host.resources.total":
          case "provider.remote_host.resources.available":
          case "provider.remote_host.resources.used":
          case "provider.remote_host.resources.reserved":
            this.data = await drawHostResourcesItemsValues(this.context, this.data, element);
            return resolve(this.data);
          case "management":
            this.data = await drawManagementItems(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.info":
            this.data = await drawManagementInfoSubItems(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.users":
            this.data = await drawManagementUserItems(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.user":
            this.data = await drawManagementUserSubItems(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.user.claims":
            this.data = await drawManagementUserItemClaims(
              this.context,
              element,
              this.data,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.user.roles":
            this.data = await drawManagementUserItemRoles(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.claims":
            this.data = await drawManagementClaims(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.roles":
            this.data = await drawManagementRoles(this.context, element, this.data, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.remote_hosts.orchestrator.catalog.cache":
          case "management.remote_hosts.orchestrator.host.catalog.cache":
          case "management.remote_hosts.remote_host.catalog.cache":
            this.data = await drawHostCatalogCache(this.context, this.data, element, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.remote_hosts.orchestrator.catalog.cache.manifests":
          case "management.remote_hosts.orchestrator.host.catalog.cache.manifests":
          case "management.remote_hosts.remote_host.catalog.cache.manifests":
            this.data = await drawHostCatalogCacheItems(this.context, this.data, element, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.remote_hosts.orchestrator.catalog.cache.manifests.manifest":
          case "management.remote_hosts.orchestrator.host.catalog.cache.manifests.manifest":
          case "management.remote_hosts.remote_host.catalog.cache.manifests.manifest":
            this.data = await drawHostCatalogCacheItemDetails(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy":
          case "management.remote_hosts.remote_host.reverse_proxy":
          case "management.remote_hosts.orchestrator.reverse_proxy":
          case "management.remote_hosts.orchestrator.host.reverse_proxy":
            this.data = await drawReverseProxyHosts(this.context, this.data, element, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host":
            this.data = await drawReverseProxyHostsHost(this.context, this.data, element, "DevOpsRemoteHostProvider");
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.tcp_route":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.tcp_route":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.tcp_route":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.tcp_route":
            this.data = await drawReverseProxyHostsHostTcpRoute(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.cors":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.cors":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.cors":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.cors":
            this.data = await drawReverseProxyHostsHostHttpRoutesCors(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.tls":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.tls":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.tls":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.tls":
            this.data = await drawReverseProxyHostsHostHttpRoutesTls(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route":
            this.data = await drawReverseProxyHostsHostHttpRoutesHttpRoute(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details":
            this.data = await drawReverseProxyHostsHostHttpRoutesHttpRouteDetails(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers":
            this.data = await drawReverseProxyHostsHostHttpRoutesHttpRouteDetailsRequestHeaders(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          case "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers":
          case "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers":
          case "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers":
          case "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers":
            this.data = await drawReverseProxyHostsHostHttpRoutesHttpRouteDetailsResponseHeaders(
              this.context,
              this.data,
              element,
              "DevOpsRemoteHostProvider"
            );
            return resolve(this.data);
          default:
            return resolve(this.data);
        }
      }
    });
  }
}
