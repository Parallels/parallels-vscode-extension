import * as vscode from "vscode";
import { FLAG_DEVOPS_CATALOG_HAS_ITEMS, FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS } from "../../constants/flags";
import { LogService } from "../../services/logService";

import { DevOpsRemoteHostsTreeItem } from "./remote_hosts_tree_item";
import { AllDevOpsCatalogCommands, AllDevOpsRemoteCommands } from "../commands/AllCommands";
import { DevOpsService } from "../../services/devopsService";
import { Provider } from "../../ioc/provider";
import { machine } from "os";

export class DevOpsRemoteHostsTreeProvider implements vscode.TreeDataProvider<DevOpsRemoteHostsTreeItem> {
  data: DevOpsRemoteHostsTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("parallels-desktop-remote-hosts", {
      treeDataProvider: this,
      showCollapseAll: true,
      canSelectMany: true
    });
    const config = Provider.getConfiguration();
    if (config.remoteHostProviders.length === 0) {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, false);
    } else {
      vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, true);
    }

    context.subscriptions.push(view);

    AllDevOpsRemoteCommands.forEach(c => c.register(context, this));
  }

  getTreeItem(element: DevOpsRemoteHostsTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<DevOpsRemoteHostsTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DevOpsRemoteHostsTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<DevOpsRemoteHostsTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (!element) {
        const config = Provider.getConfiguration();
        const providers = config.allRemoteHostProviders;
        for (const provider of providers) {
          const id = `${provider.name.toLowerCase().replace(" ", "_")}%%${provider.ID}`
          let icon = provider.type === "orchestrator" ? "remote_hosts_provider_orchestrator" : "remote_hosts_provider_host"
          switch (provider.state) {
            case "active":
              icon = `${icon}_active`;
              break;
            case "inactive":
              icon = `${icon}_inactive`;
              break;
          }
          let collapsible = provider.virtualMachines.length === 0 ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
          if (provider.type === "orchestrator") {
            collapsible = vscode.TreeItemCollapsibleState.Collapsed;
          }
          if (provider.state === "inactive") {
            collapsible = vscode.TreeItemCollapsibleState.None;
          }
          this.data.push(
            new DevOpsRemoteHostsTreeItem(
              id,
              "",
              provider.name,
              provider.type === "orchestrator" ? "orchestrator" : "remote_host",
              provider.name,
              provider.state,
              provider.rawHost,
              "devops.remote.provider",
              collapsible,
              icon,
              provider
            )
          );
        }

        if (this.data.length > 0) {
          vscode.commands.executeCommand("setContext", FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS, true);
          DevOpsService.startRemoteHostsViewAutoRefresh();
        }
        resolve(this.data);
      } else {
        switch (element.type) {
          case "orchestrator":
            this.drawOrchestratorSubItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "remote_host":
            this.drawRemoteHostVirtualMachineItem(element).then(() => {
              resolve(this.data);
            });
            break;
          case "virtualMachines":
            this.drawOrchestratorVirtualMachines(element).then(() => {
              resolve(this.data);
            });
            break;
          case "virtualMachine":
            this.drawOrchestratorVirtualMachineHostItem(element).then(() => {
              resolve(this.data);
            });
            break;
          case "hosts":
            this.drawOrchestratorHostsItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "resources":
            this.drawOrchestratorResourceArchitectureItem(element).then(() => {
              resolve(this.data);
            });
            break;
          case "resources_architecture":
            this.drawOrchestratorResourceArchitectureSubItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "resources_architecture_total":
          case "resources_architecture_available":
          case "resources_architecture_used":
          case "resources_architecture_reserved":
            this.drawOrchestratorResourceArchitectureTotalResourcesItems(element).then(() => {
              resolve(this.data);
            });
            break;
          default:
            return resolve(this.data);
        }
      }
    });
  }

  drawOrchestratorSubItems(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "orchestrator") {
        const elementId = element.id.split("%%")[1];
        const provider = Provider.getConfiguration().findRemoteHostProviderById(elementId);
        const hostsLength = provider?.hosts?.length ?? 0;
        this.data.push(
          new DevOpsRemoteHostsTreeItem(
            `${elementId}%%resources`,
            elementId,
            "Resources",
            "resources",
            "Resources",
            "",
            "",
            "devops.remote.orchestrator.resources",
            hostsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_resources"
          )
        );
        this.data.push(
          new DevOpsRemoteHostsTreeItem(
            `${elementId}%%hosts`,
            elementId,
            "Hosts",
            "hosts",
            "Hosts",
            "",
            "",
            "devops.remote.orchestrator.hosts",
            hostsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_hosts"
          )
        );
        this.data.push(
          new DevOpsRemoteHostsTreeItem(
            `${elementId}%%virtual_machines`,
            elementId,
            "Virtual Machines",
            "virtualMachines",
            "Virtual Machines",
            "",
            "",
            "devops.remote.orchestrator.virtual_machines",
            hostsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "group"
          )
        );
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorResourceArchitectureItem(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "resources") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const resource of provider.resources ?? []) {
            const id = `${element.id}%%${resource.cpu_type}`
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                id,
                elementId,
                resource.cpu_type,
                "resources_architecture",
                resource.cpu_type,
                "",
                "",
                "devops.remote.orchestrator.resources.architecture",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources_architecture",
                provider
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorResourceArchitectureSubItems(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "resources_architecture") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const architectureId = element.id.split("%%")[2];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const resource of provider.resources ?? []) {
            const id = `${elementId}%%${resource.cpu_type}`
            if (resource.cpu_type !== architectureId) {
              continue;
            }
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${id}%%resources_total`,
                elementId,
                "Total",
                "resources_architecture_total",
                "Total Resources",
                "",
                "",
                "devops.remote.orchestrator.resources.total",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${id}%%resources_available`,
                elementId,
                "Available",
                "resources_architecture_available",
                "Total Available Resources",
                "",
                "",
                "devops.remote.orchestrator.resources.total_available",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${id}%%resources_used`,
                elementId,
                "Used",
                "resources_architecture_used",
                "Total Used Resources",
                "",
                "",
                "devops.remote.orchestrator.resources.total_used",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${id}%%resources_reserved`,
                elementId,
                "Reserved",
                "resources_architecture_reserved",
                "Total Reserved Resources",
                "",
                "",
                "devops.remote.orchestrator.resources.total_reserved",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorResourceArchitectureTotalResourcesItems(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element) {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const architectureId = element.id.split("%%")[1];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const resource of provider.resources ?? []) {
            if (resource.cpu_type !== architectureId) {
              continue;
            }

            let cpuTotal = 0;
            let memoryTotal = 0
            const id = `${element.id}%%${resource.cpu_type}%%${element.type}`
            if (element.type === "resources_architecture_total") {
              cpuTotal = resource["total"].logical_cpu_count?? 0;
              memoryTotal = resource["total"].memory_size?? 0;
            } else if (element.type === "resources_architecture_available") {
              cpuTotal = resource["total_available"].logical_cpu_count?? 0;
              memoryTotal = resource["total_available"].memory_size?? 0;
            } else if (element.type === "resources_architecture_used") {
              cpuTotal = resource["total_in_use"].logical_cpu_count?? 0;
              memoryTotal = resource["total_in_use"].memory_size ?? 0;
            } else if (element.type === "resources_architecture_reserved") {
              cpuTotal = resource["total_reserved"].logical_cpu_count?? 0;
              memoryTotal = resource["total_reserved"].memory_size?? 0;
            }
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${id}%%cpu`,
                elementId,
                `CPU: ${cpuTotal} Cores`,
                element.type,
                `CPU: ${cpuTotal} Cores`,
                "",
                "",
                "devops.remote.orchestrator.resources.architecture.total",
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_cpu",
                provider
              )
            );
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${id}%%memory`,
                elementId,
                `Memory: ${memoryTotal} Mb`,
                element.type,
                `Memory: ${memoryTotal} Mb`,
                "",
                "",
                "devops.remote.orchestrator.resources.architecture.total",
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_memory",
                provider
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorHostsItems(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "hosts") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const host of provider.hosts?.sort((a, b) => a.description.localeCompare(b.description)) ?? []) {
            let icon = "remote_hosts_provider_orchestrator_host"
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
            const id = `${provider.ID}%%${host.id}`
            const context = `devops.remote.orchestrator.host_${host.state}_${host.enabled ? "enabled" : "disabled"}`
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                id,
                element.id,
                host.description,
                "hosts_host",
                host.description,
                host.cpu_model,
                host.cpu_model,
                context,
                vscode.TreeItemCollapsibleState.None,
                icon,
                provider
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorVirtualMachines(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "virtualMachines") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const virtualMachine of provider.virtualMachines.sort((a, b) => a.Name.localeCompare(b.Name))){
            let icon = "virtual_machine"
            if (virtualMachine.State === "running") {
              icon = `virtual_machine_running`;
            } else if (virtualMachine.State === "paused" || virtualMachine.State === "suspended") {
              icon = `virtual_machine_paused`;
            }
            const id = `${elementId}%%${virtualMachine.host_id ?? element.id}%%${virtualMachine.ID}`
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                id,
                element.id,
                virtualMachine.Name,
                "virtualMachine",
                virtualMachine.Name,
                virtualMachine.State,
                virtualMachine.State,
                `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}`,
                provider.type === "orchestrator" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                icon,
                virtualMachine
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorVirtualMachineHostItem(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "virtualMachine") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const machineID = element.id.split("%%")[2];
        const hostId = element.id.split("%%")[1];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          const host = config.findRemoteHostProviderHostById(provider.ID, hostId);
          for (const virtualMachine of provider.virtualMachines.sort((a, b) => a.Name.localeCompare(b.Name))) {
            if (virtualMachine.ID !== machineID) {
              continue;
            }

            let icon = "remote_hosts_provider_orchestrator_host"
            switch (virtualMachine.host_state) {
              case "healthy":
                icon = `${icon}_active`;
                break;
              case "unhealthy":
                icon = `${icon}_inactive`;
                break;
            }
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                `${virtualMachine.host_id}%%${virtualMachine.ID}%%host`,
                element.id,
                virtualMachine.host,
                "hosts_host",
                host?.description ?? virtualMachine.host,
                virtualMachine.host,
                virtualMachine.host,
                "devops.remote.provider.virtual_machine.host",
                vscode.TreeItemCollapsibleState.None,
                icon,
                virtualMachine
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawRemoteHostVirtualMachineItem(element: DevOpsRemoteHostsTreeItem): Thenable<DevOpsRemoteHostsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "remote_host") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[1];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const virtualMachine of provider.virtualMachines.sort((a, b) => a.Name.localeCompare(b.Name))) {
            let icon = "virtual_machine"
            if (virtualMachine.State === "running") {
              icon = `virtual_machine_running`;
            } else if (virtualMachine.State === "paused" || virtualMachine.State === "suspended") {
              icon = `virtual_machine_paused`;
            }
            const id = `${elementId}%%local%%${virtualMachine.ID}`
            this.data.push(
              new DevOpsRemoteHostsTreeItem(
                id,
                elementId,
                virtualMachine.Name,
                "virtualMachine",
                virtualMachine.Name,
                virtualMachine.State,
                virtualMachine.State,
                `devops.remote.host.virtual_machine.${virtualMachine.State}`,
                vscode.TreeItemCollapsibleState.None,
                icon,
                virtualMachine
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }
}
