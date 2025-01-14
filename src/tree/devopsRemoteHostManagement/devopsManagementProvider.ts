import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";

export function drawManagementItems(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }
      const usersLength = provider?.users?.length ?? 0;
      const claimsLength = provider?.claims?.length ?? 0;
      const rolesLength = provider?.roles?.length ?? 0;
      let reverseProxyHostsLength = 0;
      let isOrchestratorHost = false;
      let hostId = "";

      if ("type" in provider) {
        if (element.id.split("%%")[1] === "hosts") {
          isOrchestratorHost = true;
          hostId = element.id.split("%%")[2];
          const reverseProxyHosts =
            provider?.reverseProxy?.reverse_proxy_hosts?.filter(h => h.host_id === hostId) ?? [];
          reverseProxyHostsLength = reverseProxyHosts.length;
        } else {
          reverseProxyHostsLength = provider?.reverseProxy?.reverse_proxy_hosts?.length ?? 0;
        }
      }

      if (!isOrchestratorHost) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${elementId}%%management.users`,
            elementId,
            "Users",
            "management.users",
            "Users",
            "",
            className,
            "devops.remote.management.users",
            usersLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_users"
          )
        );
        data.push(
          new DevOpsTreeItem(
            context,
            `${elementId}%%roles`,
            elementId,
            "Roles",
            "management.roles",
            "Roles",
            "",
            className,
            "devops.remote.management.roles",
            rolesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_roles"
          )
        );
        data.push(
          new DevOpsTreeItem(
            context,
            `${elementId}%%management.claims`,
            elementId,
            "Claims",
            "management.claims",
            "Claims",
            "",
            className,
            "devops.remote.management.claims",
            claimsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_claims"
          )
        );
      }
      if (reverseProxyHostsLength > 0) {
        let itemType = element.type;
        if (className === "DevOpsCatalogHostProvider") {
          itemType = "management.catalog_provider.reverse_proxy";
        }
        if (className === "DevOpsRemoteHostProvider") {
          if ("type" in provider && provider.type === "orchestrator") {
            if (element.id.split("%%")[1] === "hosts") {
              itemType = "management.remote_hosts.orchestrator.host.reverse_proxy";
            } else {
              itemType = "management.remote_hosts.orchestrator.reverse_proxy";
            }
          } else {
            itemType = "management.remote_hosts.remote_host.reverse_proxy";
          }
        }
        const id = `${elementId}%%hosts%%${hostId}%%management%%reverse_proxy`;
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}`,
            elementId,
            "Reverse Proxy",
            itemType,
            "Reverse Proxy",
            "",
            className,
            "devops.remote.management.reverse_proxy",
            vscode.TreeItemCollapsibleState.Collapsed,
            "reverse_proxy"
          )
        );
      }

      if (provider?.catalogCache?.manifests?.length ?? 0 > 0) {
        let itemType = element.type;
        if (className === "DevOpsCatalogHostProvider") {
          itemType = "management.catalog_provider.catalog.cache";
        }
        if (className === "DevOpsRemoteHostProvider") {
          if ("type" in provider && provider.type === "orchestrator") {
            if (element.id.split("%%")[1] === "hosts") {
              itemType = "management.remote_hosts.orchestrator.host.catalog.cache";
            } else {
              itemType = "management.remote_hosts.orchestrator.catalog.cache";
            }
          } else {
            itemType = "management.remote_hosts.remote_host.catalog.cache";
          }
        }
        const id = `${elementId}%%hosts%%${hostId}%%management%%catalog_cache`;
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            elementId,
            "Catalog Cache",
            itemType,
            "Catalog Cache",
            "",
            className,
            "devops.remote.management.catalog.cache",
            usersLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "catalog_cache"
          )
        );
      } else {
        console.log("No Catalog Cache Items Found");
      }
    }

    return resolve(data);
  });
}

export function drawManagementUserItems(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }

      for (const user of provider.users?.sort((a, b) => a.name.localeCompare(b.name)) ?? []) {
        const id = `${elementId}%%management%%users%%${user.id}`;
        const hasRolesOrClaims = user.roles.length > 0 || user.claims.length > 0;
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            elementId,
            user.name,
            "management.user",
            user.name,
            `${user.username} - ${user.email}`,
            className,
            `devops.remote.management.user`,
            hasRolesOrClaims ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_user"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementInfoSubItems(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }
      const id = `${elementId}%%management%%info`;
      if (!provider?.hardwareInfo && provider?.hardwareInfo?.devops_version) {
        return resolve(data);
      }

      if (provider?.hardwareInfo && provider?.hardwareInfo?.cpu_brand) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%cpu`,
            elementId,
            `CPU: ${provider?.hardwareInfo?.cpu_brand}`,
            "management.info.cpu",
            `CPU: ${provider?.hardwareInfo?.cpu_brand}`,
            "",
            className,
            "devops.remote.management.info.cpu",
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_resources_architecture"
          )
        );
      }
      if (
        provider?.hardwareInfo &&
        provider?.hardwareInfo?.cpu_type &&
        provider?.hardwareInfo?.cpu_type !== "unknown"
      ) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%architecture`,
            elementId,
            `Architecture: ${provider?.hardwareInfo?.cpu_type}`,
            "management.info.architecture",
            `Architecture: ${provider?.hardwareInfo?.cpu_type}`,
            "",
            className,
            "devops.remote.management.info.architecture",
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_resources_architecture"
          )
        );
      }
      if (provider?.hardwareInfo && provider?.hardwareInfo?.devops_version) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%devops_version`,
            elementId,
            `DevOps Service ${provider?.hardwareInfo?.devops_version}`,
            "management.info.devops_version",
            `DevOps Service ${provider?.hardwareInfo?.devops_version}`,
            "",
            className,
            "devops.remote.management.info.devops_version",
            vscode.TreeItemCollapsibleState.None,
            "management_information_item"
          )
        );
      }
      if (provider?.hardwareInfo && provider?.hardwareInfo?.parallels_desktop_version) {
        let caption = `Parallels Desktop ${provider?.hardwareInfo?.parallels_desktop_version}`;
        if (provider?.hardwareInfo?.parallels_desktop_licensed) {
          caption += " (Licensed)";
        } else {
          caption += " (Not Licensed)";
        }
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%parallels_desktop_version`,
            elementId,
            caption,
            "management.info.parallels_desktop_version",
            caption,
            "",
            className,
            "devops.remote.management.info.devops_version",
            vscode.TreeItemCollapsibleState.None,
            "management_information_item"
          )
        );
      }
      if (provider?.hardwareInfo && provider?.hardwareInfo?.os_name) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%os`,
            elementId,
            `OS: ${provider?.hardwareInfo?.os_name} ${provider?.hardwareInfo?.os_version}`,
            "management.info.os",
            `OS: ${provider?.hardwareInfo?.os_name} ${provider?.hardwareInfo?.os_version}`,
            "",
            className,
            "devops.remote.management.info.os",
            vscode.TreeItemCollapsibleState.None,
            "management_information_item"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementUserSubItems(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const userId = element.id.split("%%")[3];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }

      const user = provider?.users?.find(u => u.id === userId);
      if (!user) {
        return resolve(data);
      }

      const id = `${elementId}%%management%%users%%${userId}`;
      const claimsLength = user?.claims?.length ?? 0;
      const rolesLength = user?.roles?.length ?? 0;
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%roles`,
          elementId,
          "Roles",
          "management.user.roles",
          "Roles",
          "",
          className,
          "devops.remote.management.user.roles",
          rolesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          "remote_hosts_management_roles"
        )
      );
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%claims`,
          elementId,
          "Claims",
          "management.user.claims",
          "Claims",
          "",
          className,
          "devops.remote.management.user.claims",
          claimsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          "remote_hosts_management_claims"
        )
      );
    }

    return resolve(data);
  });
}

export function drawManagementUserItemClaims(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const userId = element.id.split("%%")[3];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }

      const user = provider?.users?.find(u => u.id === userId);
      if (!user) {
        return resolve(data);
      }

      for (const claim of user.claims?.sort((a, b) => a.localeCompare(b)) ?? []) {
        const id = `${elementId}%%management%%users%%${user.id}%%claims%%${claim}`;
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            elementId,
            claim,
            "management.user.claim",
            claim,
            "",
            className,
            `devops.remote.management.user.role`,
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementUserItemRoles(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const userId = element.id.split("%%")[3];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }

      const user = provider?.users?.find(u => u.id === userId);
      if (!user) {
        return resolve(data);
      }

      for (const role of user.roles?.sort((a, b) => a.localeCompare(b)) ?? []) {
        const id = `${elementId}%%management%%users%%${user.id}%%roles%%${role}`;
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            elementId,
            role,
            "management.user.role",
            role,
            "",
            className,
            `devops.remote.management.user.role`,
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_role"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementClaims(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }

      for (const claim of provider.claims?.sort((a, b) => a.name.localeCompare(b.name)) ?? []) {
        const id = `${elementId}%%management%%claims%%${claim.name}`;
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            elementId,
            claim.name,
            "management.claim",
            claim.name,
            "",
            className,
            `devops.remote.management.claim`,
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementRoles(
  context: vscode.ExtensionContext,
  element: DevOpsTreeItem,
  data: DevOpsTreeItem[],
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(elementId);
      }
      if (className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(elementId);
      }
      if (!provider) {
        return resolve(data);
      }

      for (const role of provider.roles?.sort((a, b) => a.name.localeCompare(b.name)) ?? []) {
        const id = `${elementId}%%management%%roles%%${role.name}`;
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            elementId,
            role.name,
            "management.role",
            role.name,
            "",
            className,
            `devops.remote.management.role`,
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}
