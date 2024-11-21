import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";
import {
  HostHardwareInfo,
  convertFromDevOpsRemoteHostReverseProxyToHostHardwareInfoReverseProxy,
  convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal
} from "../../models/devops/hardwareInfo";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";

export function getId(
  provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined,
  element: DevOpsTreeItem,
  index: number
): string {
  if (!provider) {
    return "";
  }
  if ("type" in provider) {
    const elementId = element.id.split("%%")[0];

    let id = `${elementId}%%${provider.type}`;
    if (provider.type === "orchestrator") {
      const host_id = element.id.split("%%")[index];
      id = `${id}%%hosts%%${host_id}`;
    }
    return id;
  } else {
    return element.id.split("%%")[0];
  }
}

export function getHostHardwareInfo(
  provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined,
  host_id: string
): HostHardwareInfo | undefined {
  if (!provider) {
    return undefined;
  }
  if ("type" in provider) {
    if (provider.type === "remote_host") {
      return provider.hardwareInfo;
    }
    if (provider.type === "orchestrator") {
      if (host_id === "info") {
        return provider.hardwareInfo;
      }

      const host = provider.hosts?.find(h => h.id === host_id);
      if (!host) {
        return undefined;
      }
      const hardware_info = {
        cpu_brand: host?.cpu_model || "",
        cpu_type: host?.architecture || "",
        devops_version: host?.devops_version || "",
        os_name: host?.os_name || "",
        os_version: host?.os_version || "",
        parallels_desktop_version: host?.parallels_desktop_version || "",
        parallels_desktop_licensed: host?.parallels_desktop_licensed || false,
        external_ip_address: host?.external_ip_address || "",
        is_reverse_proxy_enabled: host?.is_reverse_proxy_enabled || false,
        reverse_proxy: convertFromDevOpsRemoteHostReverseProxyToHostHardwareInfoReverseProxy(host?.reverse_proxy),
        system_reserved: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total_available: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total_in_use: {logical_cpu_count: 0, memory_size: 0, disk_count: 0},
        total_reserved: {logical_cpu_count: 0, memory_size: 0, disk_count: 0}
      };

      if (host?.detailed_resources) {
        hardware_info.system_reserved = convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal(
          host.detailed_resources.system_reserved
        );
        hardware_info.total = convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal(host.detailed_resources.total);
        hardware_info.total_available = convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal(
          host.detailed_resources.total_available
        );
        hardware_info.total_in_use = convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal(
          host.detailed_resources.total_in_use
        );
        hardware_info.total_reserved = convertFromDevOpsRemoteHostResourceToHostHardwareInfoTotal(
          host.detailed_resources.total_reserved
        );
      }

      return hardware_info;
    }
    return provider.hardwareInfo;
  } else {
    return provider.hardwareInfo;
  }
}
