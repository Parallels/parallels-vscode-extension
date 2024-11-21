import * as vscode from "vscode";
import {Provider} from "../../ioc/provider";
import {DevOpsTreeItem} from "../treeItems/devOpsTreeItem";

export function drawRemoteHostItems(
  context: vscode.ExtensionContext,
  data: DevOpsTreeItem[],
  element: DevOpsTreeItem
): Thenable<DevOpsTreeItem[]> {
  return new Promise(async (resolve, reject) => {
    data = [];
    if (
      (element && element.type === "provider.remote_host.host") ||
      element.type === "provider.remote_host.orchestrator"
    ) {
      const elementId = element.id.split("%%")[1];
      const provider = Provider.getConfiguration().findRemoteHostProviderById(elementId);
      const virtualMachinesLength = provider?.virtualMachines?.length ?? 0;
      const isSuperUser = provider?.user?.isSuperUser ?? false;
      const vmsLength = provider?.virtualMachines?.length ?? 0;
      let enabledHosts = [];
      let disabledHosts = [];
      let hostsLength = 0;
      let id = `${elementId}%%remote_host`;
      if (!provider) {
        return resolve(data);
      }
      if (element.type === "provider.remote_host.orchestrator") {
        id = `${elementId}%%orchestrator`;
        hostsLength = provider?.hosts?.length ?? 0;
        enabledHosts = provider?.hosts?.filter(h => h.enabled) ?? [];
        disabledHosts = provider?.hosts?.filter(h => !h.enabled) ?? [];
      }
      if (isSuperUser) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%info`,
            elementId,
            "Information",
            "provider.remote_host.host.info",
            "Information",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.host.info",
            vscode.TreeItemCollapsibleState.Collapsed,
            "info"
          )
        );
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%management`,
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
      // Regular hardware resources
      if (
        provider?.hardwareInfo &&
        provider.hardwareInfo.total &&
        element.type !== "provider.remote_host.orchestrator"
      ) {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%resources`,
            elementId,
            "Resources",
            "provider.remote_host.host.resources",
            "Resources",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.host.resources",
            vscode.TreeItemCollapsibleState.Collapsed,
            "remote_hosts_provider_orchestrator_resources"
          )
        );
      }
      // Orchestrator resources
      if (element.type === "provider.remote_host.orchestrator") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%resources`,
            elementId,
            "Resources",
            "provider.remote_host.orchestrator.resources",
            "Resources",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.host.resources",
            vscode.TreeItemCollapsibleState.Collapsed,
            "remote_hosts_provider_orchestrator_resources"
          )
        );
      }
      if (element.type === "provider.remote_host.orchestrator") {
        data.push(
          new DevOpsTreeItem(
            context,
            `${id}%%hosts`,
            elementId,
            "Hosts",
            "provider.remote_host.hosts",
            "Hosts",
            `${
              hostsLength > 0
                ? `(${enabledHosts.length > 0 ? enabledHosts.length + " enabled" : ""}${
                    enabledHosts.length > 0 && disabledHosts.length > 0 ? " , " : ""
                  }${disabledHosts.length > 0 ? disabledHosts.length + " disabled" : ""})`
                : ""
            }`,
            "DevOpsRemoteHostProvider",
            "devops.remote.orchestrator.hosts",
            hostsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_hosts"
          )
        );
      }
      data.push(
        new DevOpsTreeItem(
          context,
          `${id}%%virtual_machines`,
          elementId,
          "Virtual Machines",
          "provider.remote_host.virtual_machines",
          "Virtual Machines",
          `${vmsLength > 0 ? "(" + vmsLength + ")" : ""}`,
          "DevOpsRemoteHostProvider",
          "devops.remote.orchestrator.virtual_machines",
          virtualMachinesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          "group"
        )
      );
    }

    return resolve(data);
  });
}
