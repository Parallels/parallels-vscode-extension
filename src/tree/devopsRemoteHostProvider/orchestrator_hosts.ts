import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {
  getCacheManifestsItems,
  getCacheManifestsItemsFromResponse
} from "../../models/parallels/catalog_cache_response";
import {compareVersions} from "../../helpers/strings";
import {getLogChannelById} from "../../services/logChannelService";

export function drawOrchestratorHostsItems(
  ctx: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element && element.type === "provider.remote_host.hosts") {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(elementId);
      if (provider) {
        for (const host of provider.hosts?.sort((a, b) => a.description.localeCompare(b.description)) ?? []) {
          let icon = "remote_hosts_provider_orchestrator_host";
          switch (host.state) {
            case "healthy":
              icon = `${icon}_active`;
              break;
            case "unhealthy":
              icon = `${icon}_inactive`;
              break;
          }
          if (!host.enabled) {
            icon = `remote_hosts_provider_orchestrator_host_disabled`;
          }
          const id = `${provider.ID}%%hosts%%${host.id}`;
          const context = `devops.remote.orchestrator.host_${host.state}_${host.enabled ? "enabled" : "disabled"}`;
          if (data.some(item => item.id === id)) {
            continue;
          }
          data.push(
            new DevOpsTreeItem(
              ctx,
              id,
              element.id,
              host.description,
              "provider.remote_host.hosts.host",
              host.description,
              host.cpu_model,
              "DevOpsRemoteHostProvider",
              context,
              vscode.TreeItemCollapsibleState.Collapsed,
              icon
            )
          );
        }
      }
    }

    return resolve(data);
  });
}

export function drawOrchestratorHostsHostItems(
  ctx: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element && element.type === "provider.remote_host.hosts.host") {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(elementId);
      const host = provider?.hosts?.find(h => h.id === element.id.split("%%")[2]);
      if (provider && host) {
        const hostId = `${provider.ID}%%hosts%%${host.id}`;
        const vms = provider.virtualMachines.filter(vm => vm.host_id === host.id);
        const context = `devops.remote.orchestrator.host_${host.state}_${host.enabled ? "enabled" : "disabled"}`;
        if (data.some(item => item.id === hostId)) {
          return resolve(data);
        }
        data.push(
          new DevOpsTreeItem(
            ctx,
            `${hostId}%%info`,
            element.id,
            "Information",
            "provider.remote_host.orchestrator.hosts.host.details.info",
            "Information",
            "",
            "DevOpsRemoteHostProvider",
            context,
            vscode.TreeItemCollapsibleState.Collapsed,
            "info"
          )
        );
        const hostCacheManifests = provider.catalogCache?.manifests.filter(cache => cache.host_id === host.id) ?? [];
        if (hostCacheManifests.length > 0) {
          const currentManifests = getCacheManifestsItems(hostCacheManifests);
          data.push(
            new DevOpsTreeItem(
              ctx,
              `${hostId}%%management`,
              elementId,
              "Management",
              "management",
              "Management",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.management",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_management"
            )
          );
        }

        if (host?.detailed_resources && host.detailed_resources?.total && host.enabled) {
          data.push(
            new DevOpsTreeItem(
              ctx,
              `${hostId}%%resources`,
              elementId,
              "Resources",
              "provider.remote_host.orchestrator.hosts.host.details.resources",
              "Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.host.resources",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources"
            )
          );
        }
        if (vms.length > 0 && host.enabled) {
          data.push(
            new DevOpsTreeItem(
              ctx,
              `${hostId}%%virtual_machines`,
              elementId,
              "Virtual Machines",
              "provider.remote_host.host.virtual_machines",
              "Virtual Machines",
              `${vms.length > 0 ? "(" + vms.length + ")" : ""}`,
              "DevOpsRemoteHostProvider",
              "devops.remote.orchestrator.virtual_machines",
              vms.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
              "group"
            )
          );
        }
        if (compareVersions(host.devops_version, "0.9.12") > 0) {
          const socketId = `${host.id}%%logs`;
          const logsSocket = getLogChannelById(socketId);
          let contextType = "devops.remote.orchestrator.devops_service.logs";
          if (logsSocket) {
            contextType = "devops.remote.orchestrator.devops_service.logs.running";
          }
          data.push(
            new DevOpsTreeItem(
              ctx,
              `${hostId}%%logs`,
              elementId,
              "Logs",
              "provider.remote_host.host.logs",
              "Logs",
              "",
              "DevOpsRemoteHostProvider",
              contextType,
              vscode.TreeItemCollapsibleState.None,
              "logs"
            )
          );
        }
      }
    }

    return resolve(data);
  });
}

export function drawOrchestratorResources(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element && element.type === "provider.remote_host.orchestrator.resources") {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(elementId);
      if (provider) {
        for (const resource of provider.resources ?? []) {
          const id = `${element.id}%%${resource.cpu_type}`;
          data.push(
            new DevOpsTreeItem(
              context,
              id,
              elementId,
              resource.cpu_type,
              "provider.remote_host.orchestrator.resources.architecture",
              resource.cpu_type,
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.orchestrator.resources.architecture",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources_architecture"
            )
          );
        }
      }
    }

    return resolve(data);
  });
}

export function drawOrchestratorResourcesArchitecture(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element && element.type === "provider.remote_host.orchestrator.resources.architecture") {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const architectureId = element.id.split("%%")[3];
      const provider = config.findRemoteHostProviderById(elementId);
      if (provider) {
        for (const resource of provider.resources ?? []) {
          if (resource.cpu_type !== architectureId) {
            continue;
          }
          if (resource && resource.system_reserved) {
            data.push(
              new DevOpsTreeItem(
                context,
                `${element.id}%%resources_system_reserved`,
                elementId,
                "Reserved for System",
                "provider.remote_host.orchestrator.resources.architecture.system_reserved",
                "Reserved for System",
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.orchestrator.system_reserved",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resource"
              )
            );
          }
          data.push(
            new DevOpsTreeItem(
              context,
              `${element.id}%%resources_total`,
              elementId,
              "Total",
              "provider.remote_host.orchestrator.resources.architecture.total",
              "Total Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.orchestrator.resources.total",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resource"
            )
          );
          data.push(
            new DevOpsTreeItem(
              context,
              `${element.id}%%resources_available`,
              elementId,
              "Available",
              "provider.remote_host.orchestrator.resources.architecture.available",
              "Total Available Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.orchestrator.resources.total_available",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resource"
            )
          );
          data.push(
            new DevOpsTreeItem(
              context,
              `${element.id}%%resources_used`,
              elementId,
              "Used",
              "provider.remote_host.orchestrator.resources.architecture.used",
              "Total Used Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.orchestrator.resources.total_used",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resource"
            )
          );
          data.push(
            new DevOpsTreeItem(
              context,
              `${element.id}%%resources_reserved`,
              elementId,
              "Reserved",
              "provider.remote_host.orchestrator.resources.architecture.reserved",
              "Total Reserved Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.orchestrator.resources.total_reserved",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resource"
            )
          );
        }
      }
    }

    return resolve(data);
  });
}

export function drawOrchestratorResourcesArchitectureResource(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const architectureId = element.id.split("%%")[3];
      const provider = config.findRemoteHostProviderById(elementId);
      if (provider) {
        for (const resource of provider.resources ?? []) {
          if (resource.cpu_type !== architectureId) {
            continue;
          }

          let cpuTotal = 0;
          let memoryTotal = 0;
          let disk_size = 0;
          let free_disk = 0;
          if (element.type === `provider.remote_host.orchestrator.resources.architecture.system_reserved`) {
            cpuTotal = resource["system_reserved"].logical_cpu_count ?? 0;
            memoryTotal = resource["system_reserved"].memory_size ?? 0;
            disk_size = resource["system_reserved"].disk_size ?? 0;
            free_disk = resource["system_reserved"].free_disk ?? 0;
          } else if (element.type === `provider.remote_host.orchestrator.resources.architecture.total`) {
            cpuTotal = resource["total"].logical_cpu_count ?? 0;
            memoryTotal = resource["total"].memory_size ?? 0;
            disk_size = resource["total"].disk_size ?? 0;
            free_disk = resource["total"].free_disk ?? 0;
          } else if (element.type === `provider.remote_host.orchestrator.resources.architecture.available`) {
            cpuTotal = resource["total_available"].logical_cpu_count ?? 0;
            memoryTotal = resource["total_available"].memory_size ?? 0;
            disk_size = resource["total_available"].disk_size ?? 0;
            free_disk = resource["total_available"].free_disk ?? 0;
          } else if (element.type === `provider.remote_host.orchestrator.resources.architecture.used`) {
            cpuTotal = resource["total_in_use"].logical_cpu_count ?? 0;
            memoryTotal = resource["total_in_use"].memory_size ?? 0;
            disk_size = resource["total_in_use"].disk_size ?? 0;
            free_disk = resource["total_in_use"].free_disk ?? 0;
          } else if (element.type === `provider.remote_host.orchestrator.resources.architecture.reserved`) {
            cpuTotal = resource["total_reserved"].logical_cpu_count ?? 0;
            memoryTotal = resource["total_reserved"].memory_size ?? 0;
            disk_size = resource["total_reserved"].disk_size ?? 0;
            free_disk = resource["total_reserved"].free_disk ?? 0;
          }
          data.push(
            new DevOpsTreeItem(
              context,
              `${element.id}%%cpu`,
              elementId,
              `CPU: ${cpuTotal} Cores`,
              element.type,
              `CPU: ${cpuTotal} Cores`,
              "",
              "DevOpsRemoteHostProvider",
              `provider.remote_host.orchestrator.resources.architecture.total`,
              vscode.TreeItemCollapsibleState.None,
              "remote_hosts_provider_orchestrator_resources_cpu"
            )
          );
          data.push(
            new DevOpsTreeItem(
              context,
              `${element.id}%%memory`,
              elementId,
              `Memory: ${memoryTotal} Mb`,
              element.type,
              `Memory: ${memoryTotal} Mb`,
              "",
              "DevOpsRemoteHostProvider",
              `provider.remote_host.orchestrator.resources.architecture.total`,
              vscode.TreeItemCollapsibleState.None,
              "remote_hosts_provider_orchestrator_resources_memory"
            )
          );
          if (disk_size > 0) {
            data.push(
              new DevOpsTreeItem(
                context,
                `${element.id}%%disk_size`,
                elementId,
                `Disk: ${disk_size * 1024} Gb`,
                element.type,
                `Disk: ${disk_size * 1024} Gb`,
                "",
                "DevOpsRemoteHostProvider",
                `provider.remote_host.orchestrator.resources.architecture.total`,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_disk"
              )
            );
          }
          if (free_disk > 0) {
            data.push(
              new DevOpsTreeItem(
                context,
                `${element.id}%%free_disk`,
                elementId,
                `Free Disk: ${disk_size * 1024} Gb`,
                element.type,
                `Free Disk: ${disk_size * 1024} Gb`,
                "",
                "DevOpsRemoteHostProvider",
                `provider.remote_host.orchestrator.resources.architecture.total`,
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_disk"
              )
            );
          }
        }
      }
    }

    return resolve(data);
  });
}
