import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";
import {getHostHardwareInfo, getId} from "../common/devops_common";

export function drawHostInfo(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem,
  className: "DevOpsCatalogHostProvider" | "DevOpsRemoteHostProvider"
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      element &&
      (element.type === "provider.remote_host.host.info" ||
        element.type === "provider.remote_host.orchestrator.hosts.host.details.info")
    ) {
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

      const id = `${getId(provider, element, 2)}`;
      const hardware_info = getHostHardwareInfo(provider, element.id.split("%%")[2]);

      if (!hardware_info) {
        return resolve(data);
      }

      let cpu = hardware_info.cpu_brand ?? "unknown";
      if (hardware_info && hardware_info?.cpu_type && hardware_info?.cpu_type !== "unknown") {
        cpu += ` (${hardware_info?.cpu_type})`;
      }

      if (hardware_info && hardware_info.cpu_brand) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%cpu`,
            elementId,
            `CPU: ${cpu}`,
            "management.info.cpu",
            `CPU: ${cpu}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.info.cpu",
            vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_resources_architecture"
          )
        );
      }
      if (hardware_info && hardware_info?.devops_version) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%devops_version`,
            elementId,
            `DevOps Service ${hardware_info?.devops_version}`,
            "management.info.devops_version",
            `DevOps Service ${hardware_info?.devops_version}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.info.devops_version",
            vscode.TreeItemCollapsibleState.None,
            "management_information_item"
          )
        );
      }
      if (hardware_info && hardware_info?.parallels_desktop_version) {
        let caption = `Parallels Desktop ${hardware_info?.parallels_desktop_version}`;
        if (hardware_info?.parallels_desktop_licensed) {
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
            "DevOpsRemoteHostProvider",
            "devops.remote.management.info.devops_version",
            vscode.TreeItemCollapsibleState.None,
            "management_information_item"
          )
        );
      }
      if (hardware_info && hardware_info?.os_name) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%os`,
            elementId,
            `OS: ${hardware_info?.os_name}`,
            "management.info.os",
            `OS: ${hardware_info?.os_name} ${hardware_info?.os_version ?? ""}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.info.os",
            vscode.TreeItemCollapsibleState.None,
            "management_information_item"
          )
        );
      }
      if (hardware_info && hardware_info?.external_ip_address) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%external_ip`,
            elementId,
            `External IP: ${hardware_info?.external_ip_address}`,
            "management.info.os",
            `External IP: ${hardware_info?.external_ip_address}`,
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.management.info.os",
            vscode.TreeItemCollapsibleState.None,
            "network_ip_address"
          )
        );
      }
    }

    return resolve(data);
  });
}
