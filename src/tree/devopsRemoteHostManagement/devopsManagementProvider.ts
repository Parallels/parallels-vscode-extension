import {config} from "process";
import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {DevOpsCatalogProvider} from "../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";

export function drawManagementItems(
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
      const usersLength = provider?.users?.length ?? 0;
      const claimsLength = provider?.claims?.length ?? 0;
      const rolesLength = provider?.roles?.length ?? 0;
      data.push(
        new DevOpsTreeItem(
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
          `${elementId}%%roles`,
          elementId,
          "Roles",
          "management.roles",
          "Roles",
          "",
          "DevOpsRemoteHostProvider",
          "devops.remote.management.roles",
          rolesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          "remote_hosts_management_roles"
        )
      );
      data.push(
        new DevOpsTreeItem(
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

    return resolve(data);
  });
}

export function drawManagementUserItems(
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

export function drawManagementUserSubItems(
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
            id,
            elementId,
            claim,
            "management.user.claim",
            claim,
            "",
            className,
            `devops.remote.management.user.role`,
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_claims"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementUserItemRoles(
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
            id,
            elementId,
            role,
            "management.user.role",
            role,
            "",
            className,
            `devops.remote.management.user.role`,
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_roles"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementClaims(
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
            id,
            elementId,
            claim.name,
            "management.claim",
            claim.name,
            "",
            className,
            `devops.remote.management.claim`,
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_claims"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawManagementRoles(
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
            id,
            elementId,
            role.name,
            "management.role",
            role.name,
            "",
            className,
            `devops.remote.management.role`,
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_management_roles"
          )
        );
      }
    }

    return resolve(data);
  });
}
