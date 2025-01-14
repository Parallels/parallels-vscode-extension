import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";
import {formatMemorySize} from "../common/formatters";
import {
  calcTotalCacheSize,
  createEmptyCatalogCacheResponse,
  getCacheManifestsItems,
  getCacheManifestsItemsFromResponse
} from "../../models/parallels/catalog_cache_response";

export function drawHostCatalogCache(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.catalog.cache" ||
        element.type === "management.remote_hosts.remote_host.catalog.cache" ||
        element.type === "management.remote_hosts.orchestrator.catalog.cache" ||
        element.type === "management.remote_hosts.orchestrator.host.catalog.cache")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let id = `${elementId}%%management%%catalog_cache`;
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

      let currentCatalogCache = provider.catalogCache;
      if (
        element.type === "management.remote_hosts.orchestrator.host.catalog.cache" &&
        "type" in provider &&
        provider.type === "orchestrator"
      ) {
        const hostId = element.id.split("%%")[2];
        id = `${elementId}%%hosts%%${hostId}%%management%%catalog_cache`;
        if (hostId === "") {
          currentCatalogCache = createEmptyCatalogCacheResponse();
        } else {
          const host = provider.hosts?.find(h => h.id === hostId);
          if (!host) {
            currentCatalogCache = createEmptyCatalogCacheResponse();
          }

          currentCatalogCache = createEmptyCatalogCacheResponse();
          currentCatalogCache.manifests = provider.catalogCache?.manifests.filter(m => m.host_id === hostId) ?? [];
          currentCatalogCache.total_size = calcTotalCacheSize(currentCatalogCache);
        }
      }

      if (!currentCatalogCache || currentCatalogCache.manifests.length === 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_items`,
            elementId,
            `No Catalog Cache Items Found`,
            element.type,
            `No Catalog Cache Items Found`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.catalog.cache.no_items",
            vscode.TreeItemCollapsibleState.None,
            "info"
          )
        );
        return resolve(data);
      }

      const currentManifests = getCacheManifestsItemsFromResponse(currentCatalogCache);
      const total_size = formatMemorySize(calcTotalCacheSize(currentCatalogCache) ?? 0);
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%total_size`,
          elementId,
          `Cache Size: ${total_size}`,
          element.type,
          `Cache Size: ${total_size}`,
          "",
          "DevOpsRemoteHostProvider",
          "devops.remote.management.catalog.cache",
          vscode.TreeItemCollapsibleState.None,
          "info"
        )
      );
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%cache_items`,
          elementId,
          `Cached Items`,
          `${element.type}.manifests`,
          `Cached Items`,
          `(${currentManifests.length})`,
          "DevOpsRemoteHostProvider",
          "devops.remote.management.catalog.cache.manifests",
          vscode.TreeItemCollapsibleState.Collapsed,
          "catalog_cache_items"
        )
      );
    }

    return resolve(data);
  });
}

export function drawHostCatalogCacheItems(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.catalog.cache.manifests" ||
        element.type === "management.remote_hosts.remote_host.catalog.cache.manifests" ||
        element.type === "management.remote_hosts.orchestrator.catalog.cache.manifests" ||
        element.type === "management.remote_hosts.orchestrator.host.catalog.cache.manifests")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      let id = `${elementId}%%management%%catalog_cache`;
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

      let currentCatalogCache = provider.catalogCache;
      if (
        element.type === "management.remote_hosts.orchestrator.host.catalog.cache.manifests" &&
        "type" in provider &&
        provider.type === "orchestrator"
      ) {
        const hostId = element.id.split("%%")[2];
        id = `${elementId}%%hosts%%${hostId}%%management%%catalog_cache`;
        if (hostId === "") {
          currentCatalogCache = createEmptyCatalogCacheResponse();
        } else {
          const host = provider.hosts?.find(h => h.id === hostId);
          if (!host) {
            currentCatalogCache = createEmptyCatalogCacheResponse();
          }

          currentCatalogCache = createEmptyCatalogCacheResponse();
          currentCatalogCache.manifests = provider.catalogCache?.manifests.filter(m => m.host_id === hostId) ?? [];
          currentCatalogCache.total_size = calcTotalCacheSize(currentCatalogCache);
        }
      }

      const versionedManifests = getCacheManifestsItems(currentCatalogCache?.manifests ?? []) ?? [];
      for (const manifest of versionedManifests) {
        if (manifest.host_id !== "") {
          id = `${id}%%${manifest.host_id}`;
        } else {
          id = `${id}%%unknown_host_id`;
        }
        const manifestId = `${id}%%${manifest.id}%%${manifest.catalog_id}%%${manifest.version}%%${manifest.architecture}`;
        let hasSubItems = false;
        const versions =
          currentCatalogCache?.manifests.filter(
            m => m.catalog_id === manifest.catalog_id && m.host_id === manifest.host_id
          ) ?? [];
        hasSubItems = versions.length > 1;
        const alreadyAdded = data.find(d => d.id === `${manifestId}%%manifest`);
        const name = manifest.catalog_id;
        let description = `(${manifest.version} for ${manifest.architecture})`;
        if ("type" in provider && element.type === "management.remote_hosts.orchestrator.catalog.cache.manifests") {
          const host = provider.hosts?.find(h => h.id === manifest.host_id);
          if (host) {
            description += ` on ${host.description === "" ? host.id : host.description}`;
          }
        }
        if (alreadyAdded) {
          continue;
        }
        data.push(
          new DevOpsTreeItem(
            context,
            `${manifestId}%%manifest`,
            elementId,
            `${name}`,
            `${element.type}.manifest`,
            `${name} ${description}`,
            description,
            "DevOpsRemoteHostProvider",
            "devops.remote.management.catalog.cache.manifests.manifest",
            hasSubItems ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawHostCatalogCacheItemDetails(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "management.catalog_provider.catalog.cache.manifests.manifest" ||
        element.type === "management.remote_hosts.remote_host.catalog.cache.manifests.manifest" ||
        element.type === "management.remote_hosts.orchestrator.catalog.cache.manifests.manifest" ||
        element.type === "management.remote_hosts.orchestrator.host.catalog.cache.manifests.manifest")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const catalogDetailParts = element.id.split("%%catalog_cache%%")[1];
      if (catalogDetailParts === "") {
        return resolve(data);
      }
      const catalogDetails = catalogDetailParts.split("%%") ?? [];

      let id = `${elementId}%%management%%catalog_cache%%item`;
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
      let currentCatalogCache = provider.catalogCache;
      if (
        element.type === "management.remote_hosts.orchestrator.host.catalog.cache.manifests.manifest" &&
        "type" in provider &&
        provider.type === "orchestrator"
      ) {
        const hostId = element.id.split("%%")[2];
        id = `${elementId}%%hosts%%${hostId}%%management%%catalog_cache`;
        if (hostId === "") {
          currentCatalogCache = createEmptyCatalogCacheResponse();
        } else {
          const host = provider.hosts?.find(h => h.id === hostId);
          if (!host) {
            currentCatalogCache = createEmptyCatalogCacheResponse();
          }

          currentCatalogCache = createEmptyCatalogCacheResponse();
          currentCatalogCache.manifests = provider.catalogCache?.manifests.filter(m => m.host_id === hostId) ?? [];
          currentCatalogCache.total_size = calcTotalCacheSize(currentCatalogCache);
        }
      }

      let hostId = "";
      if (catalogDetails[catalogDetails.length - 6] !== "unknown_host_id") {
        hostId = catalogDetails[catalogDetails.length - 6];
      }
      const versions =
        currentCatalogCache?.manifests.filter(
          m => m.catalog_id === catalogDetails[catalogDetails.length - 4] && m.host_id === hostId
        ) ?? [];
      if (versions.length === 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%no_versions`,
            elementId,
            `No Versions Found`,
            `${element.type}.version`,
            `No Versions Found`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.catalog.cache.manifests.manifest.no_version",
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
        return resolve(data);
      }
      for (const manifest of versions) {
        if (manifest.host_id !== "") {
          id = `${id}%%${manifest.host_id}`;
        } else {
          id = `${id}%%unknown_host_id`;
        }
        const manifestId = `${id}%%${manifest.id}%%${manifest.catalog_id}%%${manifest.version}%%${manifest.architecture}`;
        const alreadyAdded = data.find(d => d.id === manifestId);
        if (alreadyAdded) {
          continue;
        }
        data.push(
          new DevOpsTreeItem(
            context,
            `${manifestId}%%info`,
            elementId,
            `${manifest.version}`,
            `${element.type}.version`,
            `${manifest.version}`,
            `(${manifest.architecture})`,
            "DevOpsRemoteHostProvider",
            "devops.remote.management.catalog.cache.manifests.manifest.version",
            vscode.TreeItemCollapsibleState.None,
            "list_element"
          )
        );
      }
    }

    return resolve(data);
  });
}
