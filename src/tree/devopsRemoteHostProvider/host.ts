import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {VirtualMachine} from "../../models/parallels/virtualMachine";
import {getHostHardwareInfo, getId} from "../common/devops_common";
import {formatDuration, formatMemorySizeStr} from "../common/formatters";

export function drawHostResourcesItems(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "provider.remote_host.host.resources" ||
        element.type === "provider.remote_host.orchestrator.hosts.host.details.resources")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(elementId);
      if (!provider) {
        return resolve(data);
      }
      const id = `${getId(provider, element, 2)}`;
      const hardware_info = getHostHardwareInfo(provider, element.id.split("%%")[2]);

      if (!hardware_info) {
        return resolve(data);
      }
      if (provider) {
        if (hardware_info && hardware_info.system_reserved) {
          data.push(
            new DevOpsTreeItem(
              context,
              `${id}%%resources_system_reserved`,
              elementId,
              "Reserved for System",
              "provider.remote_host.resources.system_reserved",
              "Reserved for System",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.host.resources.system_reserved",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources"
            )
          );
        }
        if (hardware_info && hardware_info.total) {
          data.push(
            new DevOpsTreeItem(
              context,
              `${id}%%resources_total`,
              elementId,
              "Total",
              "provider.remote_host.resources.total",
              "Total Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.host.resources.total",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources"
            )
          );
        }
        if (hardware_info && hardware_info.total_available) {
          data.push(
            new DevOpsTreeItem(
              context,
              `${id}%%resources_available`,
              elementId,
              "Available",
              "provider.remote_host.resources.available",
              "Total Available Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.host.resources.total_available",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources"
            )
          );
        }
        if (hardware_info && hardware_info.total_in_use) {
          data.push(
            new DevOpsTreeItem(
              context,
              `${id}%%resources_used`,
              elementId,
              "Used",
              "provider.remote_host.resources.used",
              "Total Used Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.host.resources.total_used",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources"
            )
          );
        }
        if (hardware_info && hardware_info.total_reserved) {
          data.push(
            new DevOpsTreeItem(
              context,
              `${id}%%resources_reserved`,
              elementId,
              "Reserved",
              "provider.remote_host.resources.reserved",
              "Total Reserved Resources",
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.host.resources.total_reserved",
              vscode.TreeItemCollapsibleState.Collapsed,
              "remote_hosts_provider_orchestrator_resources"
            )
          );
        }
      }
    }

    return resolve(data);
  });
}

export function drawHostResourcesItemsValues(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (element) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(elementId);
      if (!provider) {
        return resolve(data);
      }
      const id = `${getId(provider, element, 3)}`;
      const hardware_info = getHostHardwareInfo(provider, element.id.split("%%")[3]);

      if (!hardware_info) {
        return resolve(data);
      }

      const resource = hardware_info ?? {
        total: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total_available: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total_in_use: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total_reserved: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        system_reserved: {logical_cpu_count: 0, memory_size: 0, disk_count: 0}
      };
      let cpuTotal = 0;
      let memoryTotal = 0;
      let disk_count = 0;
      let item_type = "unknown";
      if (element.type === `provider.remote_host.resources.system_reserved`) {
        item_type = "system_reserved";
        cpuTotal = resource["system_reserved"].logical_cpu_count ?? 0;
        memoryTotal = resource["system_reserved"].memory_size ?? 0;
        disk_count = resource["system_reserved"].disk_count ?? 0;
      } else if (element.type === `provider.remote_host.resources.total`) {
        item_type = "total";
        cpuTotal = resource["total"].logical_cpu_count ?? 0;
        memoryTotal = resource["total"].memory_size ?? 0;
        disk_count = resource["total"].disk_count ?? 0;
      } else if (element.type === `provider.remote_host.resources.available`) {
        item_type = "available";
        cpuTotal = resource["total_available"].logical_cpu_count ?? 0;
        memoryTotal = resource["total_available"].memory_size ?? 0;
        disk_count = resource["total_available"].disk_count ?? 0;
      } else if (element.type === `provider.remote_host.resources.used`) {
        item_type = "used";
        cpuTotal = resource["total_in_use"].logical_cpu_count ?? 0;
        memoryTotal = resource["total_in_use"].memory_size ?? 0;
        disk_count = resource["total_in_use"].disk_count;
      } else if (element.type === `provider.remote_host.resources.reserved`) {
        item_type = "reserved";
        cpuTotal = resource["total_reserved"].logical_cpu_count ?? 0;
        memoryTotal = resource["total_reserved"].memory_size ?? 0;
        disk_count = resource["total_reserved"].disk_count ?? 0;
      }
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%${item_type}%%cpu`,
          elementId,
          `CPU: ${cpuTotal} Cores`,
          element.type,
          `CPU: ${cpuTotal} Cores`,
          "",
          "DevOpsRemoteHostProvider",
          `provider.remote_host.host.resources.architecture.total`,
          vscode.TreeItemCollapsibleState.None,
          "remote_hosts_provider_orchestrator_resources_cpu"
        )
      );
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%${item_type}%%memory`,
          elementId,
          `Memory: ${memoryTotal} Mb`,
          element.type,
          `Memory: ${memoryTotal} Mb`,
          "",
          "DevOpsRemoteHostProvider",
          `provider.remote_host.host.resources.architecture.total`,
          vscode.TreeItemCollapsibleState.None,
          "remote_hosts_provider_orchestrator_resources_memory"
        )
      );
      if (disk_count > 0) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%${item_type}%%disk_count`,
            elementId,
            `Disk: ${disk_count * 1024} Gb`,
            element.type,
            `Disk: ${disk_count * 1024} Gb`,
            "",
            "DevOpsRemoteHostProvider",
            `provider.remote_host.host.resources.architecture.total`,
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_resources_disk"
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawHostVirtualMachines(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "provider.remote_host.host.virtual_machines" ||
        element.type === "provider.remote_host.virtual_machines")
    ) {
      const config = Provider.getConfiguration();
      const idParts = element.id.split("%%");
      const elementId = idParts[0];
      const elementType =
        element.type === "provider.remote_host.host.virtual_machines"
          ? "provider.remote_host.host.virtual_machines.virtual_machine"
          : "provider.remote_host.virtual_machines.virtual_machine";
      const provider = config.findRemoteHostProviderById(elementId);
      if (!provider) {
        return resolve(data);
      }
      let vms = provider.virtualMachines;
      if (element.type === "provider.remote_host.host.virtual_machines") {
        vms = provider.virtualMachines.filter(vm => vm.host_id === element.id.split("%%")[2]);
      }

      for (const virtualMachine of vms.sort((a, b) => a.Name.localeCompare(b.Name))) {
        let icon = "virtual_machine";
        if (virtualMachine.State === "running") {
          icon = `virtual_machine_running`;
        } else if (virtualMachine.State === "paused" || virtualMachine.State === "suspended") {
          icon = `virtual_machine_paused`;
        }

        let id = `${elementId}%%virtual_machines%%${virtualMachine.ID}`;
        if (element.type === "provider.remote_host.host.virtual_machines") {
          id = `${elementId}%%${virtualMachine.host_id ? virtualMachine.host_id : "local"}%%virtual_machines%%${
            virtualMachine.ID
          }`;
        }

        if (data.some(item => item.id === id)) {
          continue;
        }
        data.push(
          new DevOpsTreeItem(
            context,
            id,
            element.id,
            virtualMachine.Name,
            elementType,
            virtualMachine.Name,
            virtualMachine.State,
            "DevOpsRemoteHostProvider",
            `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            icon
          )
        );
      }
    }

    return resolve(data);
  });
}

export function drawHostVirtualMachine(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "provider.remote_host.virtual_machines.virtual_machine" ||
        element.type === "provider.remote_host.host.virtual_machines.virtual_machine")
    ) {
      const config = Provider.getConfiguration();
      const elementId = element.id.split("%%")[0];
      const provider = config.findRemoteHostProviderById(elementId);
      if (!provider) {
        return resolve(data);
      }
      let virtualMachine: VirtualMachine | undefined = undefined;
      if (element.type === "provider.remote_host.host.virtual_machines.virtual_machine") {
        virtualMachine = provider.virtualMachines.find(vm => vm.ID === element.id.split("%%")[3]);
      } else {
        virtualMachine = provider.virtualMachines.find(vm => vm.ID === element.id.split("%%")[2]);
      }
      if (!virtualMachine) {
        return resolve(data);
      }

      let id = `${elementId}%%virtual_machines%%${virtualMachine.ID}`;
      if (element.type === "provider.remote_host.host.virtual_machines.virtual_machine") {
        id = `${elementId}%%${virtualMachine.host_id ? virtualMachine.host_id : "local"}%%virtual_machines%%${
          virtualMachine.ID
        }`;
      }
      if (data.some(item => item.id === id)) {
        return resolve(data);
      }
      const memorySize = formatMemorySizeStr(virtualMachine.Hardware.memory.size ?? 0);
      const diskSize = formatMemorySizeStr(virtualMachine.Hardware.hdd0.size ?? 0);
      const uptime = formatDuration(virtualMachine.Uptime);
      if (
        provider.type === "orchestrator" &&
        element.type === "provider.remote_host.virtual_machines.virtual_machine"
      ) {
        const hostname = provider.hosts?.find(h => h.id === virtualMachine.host_id)?.description ?? "";
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%host`,
            element.id,
            `Host: ${hostname}`,
            element.type,
            `Host: ${hostname}`,
            "",
            "DevOpsRemoteHostProvider",
            `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_host"
          )
        );
      }
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%cpu`,
          element.id,
          `${virtualMachine.Hardware.cpu.cpus ?? 0} Cores`,
          element.type,
          `${virtualMachine.Hardware.cpu.cpus ?? 0} Cores`,
          "",
          "DevOpsRemoteHostProvider",
          `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

          vscode.TreeItemCollapsibleState.None,
          "remote_hosts_provider_orchestrator_resources_cpu"
        )
      );
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%memory`,
          element.id,
          `${memorySize} Memory`,
          element.type,
          `${memorySize} Memory`,
          "",
          "DevOpsRemoteHostProvider",
          `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

          vscode.TreeItemCollapsibleState.None,
          "remote_hosts_provider_orchestrator_resources_memory"
        )
      );

      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%disk`,
          element.id,
          `${diskSize} Disk used`,
          element.type,
          `${diskSize} Disk used`,
          "",
          "DevOpsRemoteHostProvider",
          `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

          vscode.TreeItemCollapsibleState.None,
          "remote_hosts_provider_orchestrator_resources_disk"
        )
      );

      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%uptime`,
          element.id,
          `Up for a total of ${uptime}`,
          element.type,
          `Up for a total of ${uptime}`,
          "",
          "DevOpsRemoteHostProvider",
          `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

          vscode.TreeItemCollapsibleState.None,
          "info"
        )
      );
      if (virtualMachine.host_external_ip_address) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%external_ip`,
            element.id,
            `External IP ${virtualMachine.host_external_ip_address}`,
            element.type,
            `External IP ${virtualMachine.host_external_ip_address}`,
            "",
            "DevOpsRemoteHostProvider",
            `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

            vscode.TreeItemCollapsibleState.None,
            "network_ip_address"
          )
        );
      }
      if (virtualMachine.internal_ip_address) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%internal_ip`,
            element.id,
            `Internal IP ${virtualMachine.internal_ip_address}`,
            element.type,
            `Internal IP ${virtualMachine.internal_ip_address}`,
            "",
            "DevOpsRemoteHostProvider",
            `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}.item`,

            vscode.TreeItemCollapsibleState.None,
            "network_ip_address"
          )
        );
      }
    }

    return resolve(data);
  });
}
