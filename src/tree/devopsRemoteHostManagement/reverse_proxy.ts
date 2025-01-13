/*eslint no-prototype-builtins: "off"*/

import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {createEmptyDevOpsReverseProxy} from "../../models/devops/reverse_proxy_hosts";
import {DevOpsRemoteHost, DevOpsRemoteHostReverseProxyHost} from "../../models/devops/remoteHost";

export function drawReverseProxy(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let id = `${elementId}%%management%%reverse_proxy`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentReverseProxy = provider.reverseProxy;
      if (
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy" &&
        "type" in provider &&
        provider.type === "orchestrator"
      ) {
        const hostId = element.id.split("%%")[2];
        id = `${elementId}%%hosts%%${hostId}%%management%%reverse_proxy`;
        if (hostId === "") {
          currentReverseProxy = createEmptyDevOpsReverseProxy();
        } else {
          const host = provider.hosts?.find(h => h.id === hostId);
          if (!host) {
            currentReverseProxy = createEmptyDevOpsReverseProxy();
          }

          const reverse_proxy_config = {
            id: "",
            enabled: host?.is_reverse_proxy_enabled ?? false,
            host: host?.reverse_proxy.host ?? "",
            port: host?.reverse_proxy.port ?? ""
          };
          currentReverseProxy = {
            reverse_proxy_config,
            reverse_proxy_hosts: host?.reverse_proxy_hosts ?? []
          };
        }
      } else if (element.type === "management.remote_hosts.orchestrator.reverse_proxy") {
        const reverse_proxy_config = {
          id: "",
          enabled: false,
          host: "",
          port: ""
        };
        currentReverseProxy = {
          reverse_proxy_config,
          reverse_proxy_hosts: []
        };

        for (const host of provider.hosts ?? []) {
          const hostRpHosts = host.reverse_proxy_hosts ?? [];
          if (!currentReverseProxy.reverse_proxy_hosts) {
            currentReverseProxy.reverse_proxy_hosts = [];
          }

          for (const rpHost of hostRpHosts) {
            rpHost.host_id = host.id;
            currentReverseProxy.reverse_proxy_hosts.push(rpHost);
          }
        }
      }

      if (
        element.type === "management.remote_hosts.remote_host.reverse_proxy" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy"
      ) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%enabled`,
            elementId,
            `Enabled: ${currentReverseProxy?.reverse_proxy_config?.enabled ? "Yes" : "No"}`,
            element.type,
            `Enabled: ${currentReverseProxy?.reverse_proxy_config?.enabled ? "Yes" : "No"}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.catalog.cache",
            vscode.TreeItemCollapsibleState.None,
            "reverse_proxy"
          )
        );
      }

      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%reverse_proxy_hosts`,
          elementId,
          `Hosts`,
          `${element.type}.hosts.host`,
          `Hosts`,
          `(${currentReverseProxy?.reverse_proxy_hosts?.length})`,
          "DevOpsRemoteHostProvider",
          "devops.remote.management.reverse_proxy.hosts",
          vscode.TreeItemCollapsibleState.Collapsed,
          "reverse_proxy_to"
        )
      );
    }

    return resolve(data);
  });
}

export function drawReverseProxyHosts(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let id = `${elementId}%%management%%reverse_proxy%%hosts`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.catalog.cache.no_items",
            vscode.TreeItemCollapsibleState.None,
            "reverse_proxy"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }
      let host: DevOpsRemoteHost | undefined = undefined;
      let currentReverseProxy: DevOpsRemoteHostReverseProxyHost[] = [];
      if (
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy" &&
        "type" in provider &&
        provider.type === "orchestrator"
      ) {
        const hostId = element.id.split("%%")[2];
        id = `${elementId}%%hosts%%${hostId}%%management%%reverse_proxy%%hosts`;
        if (hostId === "") {
          currentReverseProxy = [];
        } else {
          host = provider.hosts?.find(h => h.id === hostId);
          if (!host) {
            currentReverseProxy = [];
          }
          currentReverseProxy = provider.reverseProxy?.reverse_proxy_hosts?.filter(h => h.host_id === hostId) ?? [];
        }
      } else if (
        element.type === "management.remote_hosts.orchestrator.reverse_proxy" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy"
      ) {
        currentReverseProxy = provider.reverseProxy?.reverse_proxy_hosts ?? [];
      }

      currentReverseProxy = currentReverseProxy.sort((a, b) => a.host.localeCompare(b.host));
      for (const rpHost of currentReverseProxy) {
        const rpHostId = rpHost.id;
        const rpHostElementId = `${elementId}%%${rpHostId}`;
        let description = "";
        if (element.type === "management.remote_hosts.orchestrator.host.reverse_proxy") {
          if (rpHost.host_id !== "") {
            id = `${elementId}%%hosts%%${rpHost.host_id}%%management%%reverse_proxy%%hosts`;
            host = provider.hosts?.find(h => h.id === rpHost.host_id);
            if (host) {
              description = `on ${host?.host}`;
            }
          }
        }
        const rpHostElement = new DevOpsTreeItem(
          context,
          `${id}%%${rpHostId}`,
          rpHostElementId,
          `From ${rpHost.host}:${rpHost.port}`,
          `${element.type}.hosts.host`,
          `From ${rpHost.host}:${rpHost.port}`,
          description,
          "DevOpsRemoteHostProvider",
          "devops.remote.management.reverse_proxy.hosts.host",
          vscode.TreeItemCollapsibleState.Collapsed,
          "reverse_proxy_from"
        );
        data.push(rpHostElement);
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHost(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy.hosts.host" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy.hosts.host" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy.hosts.host" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 1];
      let id = `${elementId}%%management%%reverse_proxy%%hosts`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.hosts.host.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }
      if (element.type === "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host") {
        if (currentHost.host_id !== "") {
          id = `${elementId}%%${currentHost.host_id}%%management%%reverse_proxy%%hosts%%${currentHost.host_id}%%management%%reverse_proxy%%hosts`;
        }
      }

      const tcpRouteLength = currentHost.tcp_route === undefined ? 0 : 1;
      const httpRouteLength = currentHost.http_routes?.length ?? 0;
      if (tcpRouteLength > 0) {
        let targetHost = "";
        if (currentHost.tcp_route?.target_host && currentHost.tcp_route?.target_host !== "---") {
          targetHost = currentHost.tcp_route?.target_host;
        }
        if (currentHost.tcp_route?.target_vm_id) {
          targetHost = currentHost.tcp_route?.target_vm_id;
        }
        if (currentHost.tcp_route?.target_port) {
          targetHost += `:${currentHost.tcp_route?.target_port}`;
        }
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%${rpHostId}%%tcp_route`,
            rpHostId,
            `Routing to TCP ${targetHost}`,
            `${element.type}.tcp_route`,
            `Routing to TCP ${targetHost}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.tcp_route.item",
            vscode.TreeItemCollapsibleState.None,
            "reverse_proxy_to"
          )
        );
      }
      if (httpRouteLength > 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%${rpHostId}%%http_routes`,
            rpHostId,
            `For HTTP Route${httpRouteLength > 1 ? "s" : ""} (${httpRouteLength})`,
            `${element.type}.http_routes.http_route`,
            `For HTTP Route${httpRouteLength > 1 ? "s" : ""} (${httpRouteLength})`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.http_route",
            vscode.TreeItemCollapsibleState.Collapsed,
            "reverse_proxy_http"
          )
        );
        if (currentHost.cors && currentHost.cors.enabled) {
          data.push(
            new DevOpsTreeItem(
              context,
              `${id}%%${rpHostId}%%cors`,
              rpHostId,
              `CORS Configuration`,
              `${element.type}.cors`,
              `CORS Configuration`,
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.management.reverse_proxy.cors",
              vscode.TreeItemCollapsibleState.Collapsed,
              "reverse_proxy_CORS"
            )
          );
          if (currentHost.tls && currentHost.tls.enabled) {
            data.push(
              new DevOpsTreeItem(
                context,
                `${id}%%${rpHostId}%%tls`,
                rpHostId,
                `TLS Configuration`,
                `${element.type}.tls`,
                `TLS Configuration`,
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.management.reverse_proxy.tls",
                vscode.TreeItemCollapsibleState.Collapsed,
                "reverse_proxy_tls"
              )
            );
          }
        }
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostTcpRoute(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy.hosts.host.tcp_route" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy.hosts.host.tcp_route" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.tcp_route" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.tcp_route")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 2];
      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%tcp_route`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.tcp_route.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }

      let targetHost: string | undefined = "";
      if (currentHost.tcp_route?.target_host) {
        targetHost = currentHost.tcp_route?.target_host;
      }
      if (currentHost.tcp_route?.target_vm_id) {
        targetHost = currentHost.tcp_route?.target_vm_id;
      }

      if (!targetHost) {
        return resolve(data);
      }

      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%target_host`,
          rpHostId,
          `On ${targetHost}:${currentHost.tcp_route?.target_port}`,
          `${element.type}`,
          `On ${targetHost}:${currentHost.tcp_route?.target_port}`,
          "",
          "DevOpsRemoteHostProvider",
          "devops.remote.management.reverse_proxy.tcp_route.item",
          vscode.TreeItemCollapsibleState.None,
          "reverse_proxy_to"
        )
      );
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostHttpRoutesCors(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy.hosts.host.cors" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy.hosts.host.cors" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.cors" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.cors")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 2];
      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%cors`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.cors.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }
      if (currentHost.cors?.allowed_origins && currentHost.cors.allowed_origins.length > 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%allowed_origin`,
            rpHostId,
            `Allowed Origin${
              currentHost.cors?.allowed_origins.length > 1 ? "s" : ""
            }: ${currentHost.cors?.allowed_origins.join(", ")}`,
            `${element.type}`,
            `Allowed Origin${
              currentHost.cors?.allowed_origins.length > 1 ? "s" : ""
            }: ${currentHost.cors?.allowed_origins.join(", ")}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.cors.allowed_origin",
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
      if (currentHost.cors?.allowed_methods && currentHost.cors.allowed_methods.length > 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%allowed_method`,
            rpHostId,
            `Allowed Method${
              currentHost.cors?.allowed_methods.length > 1 ? "s" : ""
            }: ${currentHost.cors?.allowed_methods.join(", ")}`,
            `${element.type}`,
            `Allowed Method${
              currentHost.cors?.allowed_methods.length > 1 ? "s" : ""
            }: ${currentHost.cors?.allowed_methods.join(", ")}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.cors.allowed_method",
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
      if (currentHost.cors?.allowed_headers && currentHost.cors.allowed_headers.length > 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%allowed_header`,
            rpHostId,
            `Allowed Header${
              currentHost.cors?.allowed_headers.length > 1 ? "s" : ""
            }: ${currentHost.cors?.allowed_headers.join(", ")}`,
            `${element.type}`,
            `Allowed Header${
              currentHost.cors?.allowed_headers.length > 1 ? "s" : ""
            }: ${currentHost.cors?.allowed_headers.join(", ")}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.cors.allowed_header",
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostHttpRoutesTls(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy.hosts.host.tls" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy.hosts.host.tls" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.tls" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.tls")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 2];
      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%tls`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.tls.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }
      if (currentHost.tls?.enabled) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%tls_item`,
            rpHostId,
            `TLS Enabled: ${currentHost.tls?.enabled ? "Yes" : "No"}`,
            `${element.type}`,
            `TLS Enabled: ${currentHost.tls?.enabled ? "Yes" : "No"}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.tls.item",
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostHttpRoutesHttpRoute(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route" ||
        element.type === "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route" ||
        element.type === "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route" ||
        element.type === "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 2];
      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%http_routes%%http_route`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.http_route.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }

      for (const httpRoute of currentHost.http_routes ?? []) {
        const httpRouteId = httpRoute.id;
        const httpRouteElementId = `${elementId}%%${rpHostId}%%${httpRouteId}`;
        let hasChildren = false;
        if (httpRoute.request_headers || httpRoute.response_headers) {
          hasChildren = true;
        }

        let targetHost = "";
        if (httpRoute.schema) {
          targetHost += `${httpRoute.schema}://`;
        } else {
          targetHost += "http://";
        }
        if (httpRoute.target_host && httpRoute.target_host !== "---") {
          targetHost += httpRoute.target_host;
        }
        if (httpRoute.target_vm_id) {
          targetHost += httpRoute.target_vm_id;
        }
        if (httpRoute.target_port) {
          targetHost += `:${httpRoute.target_port}`;
        }

        if (httpRoute.path) {
          if (!httpRoute.path.startsWith("/")) {
            targetHost += "/";
          }
          targetHost += httpRoute.path;
        }

        const httpRouteElement = new DevOpsTreeItem(
          context,
          `${id}%%${httpRouteId}`,
          httpRouteElementId,
          `Routing to ${targetHost}`,
          `${element.type}.details`,
          `Routing to ${targetHost}`,
          "",
          "DevOpsRemoteHostProvider",
          "devops.remote.management.reverse_proxy.http_route",
          hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          "reverse_proxy_to"
        );
        data.push(httpRouteElement);
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostHttpRoutesHttpRouteDetails(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details" ||
        element.type ===
          "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details" ||
        element.type ===
          "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details" ||
        element.type ===
          "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 4];
      const httpRouteId = idParts[idParts.length - 1];

      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%http_routes%%http_route%%items`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.http_route.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }
      const currentHttpRoute = currentHost.http_routes?.find(h => h.id === httpRouteId);
      if (!currentHttpRoute) {
        return resolve(data);
      }

      if (currentHttpRoute.request_headers) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%${httpRouteId}%%request_headers`,
            httpRouteId,
            `Request Headers`,
            `${element.type}.request_headers`,
            `Request Headers`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.headers_request",
            vscode.TreeItemCollapsibleState.Collapsed,
            "reverse_proxy_headers_request"
          )
        );
      }

      if (currentHttpRoute.response_headers) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%${httpRouteId}%%response_headers`,
            httpRouteId,
            `Response Headers`,
            `${element.type}.response_headers`,
            `Response Headers`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.headers_response",
            vscode.TreeItemCollapsibleState.Collapsed,
            "reverse_proxy_headers_response"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostHttpRoutesHttpRouteDetailsRequestHeaders(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type ===
        "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers" ||
        element.type ===
          "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers" ||
        element.type ===
          "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers" ||
        element.type ===
          "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details.request_headers")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 6];
      const httpRouteId = idParts[idParts.length - 2];

      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%http_routes%%http_route%%items%%${httpRouteId}`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.headers_request.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }
      const currentHttpRoute = currentHost.http_routes?.find(h => h.id === httpRouteId);
      if (!currentHttpRoute) {
        return resolve(data);
      }

      if (currentHttpRoute.request_headers) {
        for (const header in currentHttpRoute.request_headers) {
          if (currentHttpRoute.request_headers.hasOwnProperty(header)) {
            const value = currentHttpRoute.request_headers[header];
            data.push(
              new DevOpsTreeItem(
                context,
                `${id}%%request_headers%%${header}%%${value}`,
                httpRouteId,
                `${header}: ${value}`,
                `${element.type}`,
                `${header}: ${value}`,
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.management.reverse_proxy.headers_request.item",
                vscode.TreeItemCollapsibleState.None,
                "list_element"
              )
            );
          }
        }
      }
    }

    return resolve(data);
  });
}

export function drawReverseProxyHostsHostHttpRoutesHttpRouteDetailsResponseHeaders(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type ===
        "management.catalog_provider.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers" ||
        element.type ===
          "management.remote_hosts.remote_host.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers" ||
        element.type ===
          "management.remote_hosts.orchestrator.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers" ||
        element.type ===
          "management.remote_hosts.orchestrator.host.reverse_proxy.hosts.host.http_routes.http_route.details.response_headers")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const rpHostId = idParts[idParts.length - 6];
      const httpRouteId = idParts[idParts.length - 2];

      const id = `${elementId}%%management%%reverse_proxy%%hosts%%${rpHostId}%%http_routes%%http_route%%items%%${httpRouteId}`;
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            element.type,
            `Reverse Proxy is currently not supported for Remote Catalogs`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.reverse_proxy.headers_response.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }
      if (!provider) {
        return resolve(data);
      }

      let currentHost: DevOpsRemoteHostReverseProxyHost | undefined = undefined;
      currentHost = provider.reverseProxy?.reverse_proxy_hosts?.find(h => h.id === rpHostId);
      if (!currentHost) {
        return resolve(data);
      }
      const currentHttpRoute = currentHost.http_routes?.find(h => h.id === httpRouteId);
      if (!currentHttpRoute) {
        return resolve(data);
      }

      if (currentHttpRoute.response_headers) {
        for (const header in currentHttpRoute.response_headers) {
          if (currentHttpRoute.response_headers.hasOwnProperty(header)) {
            const value = currentHttpRoute.response_headers[header];
            data.push(
              new DevOpsTreeItem(
                context,
                `${id}%%response_headers%%${header}%%${value}`,
                httpRouteId,
                `${header}: ${value}`,
                `${element.type}`,
                `${header}: ${value}`,
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.management.reverse_proxy.headers_response.item",
                vscode.TreeItemCollapsibleState.None,
                "list_element"
              )
            );
          }
        }
      }
    }

    return resolve(data);
  });
}
