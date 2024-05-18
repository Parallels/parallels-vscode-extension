import * as vscode from "vscode";
import { FLAG_DEVOPS_REMOTE_HOST_HAS_ITEMS } from "../../constants/flags";
import { AllDevOpsRemoteCommands } from "../commands/AllCommands";
import { DevOpsService } from "../../services/devopsService";
import { Provider } from "../../ioc/provider";
import { DevOpsTreeItem } from "../treeItems/devOpsTreeItem";
import { drawManagementItems, drawManagementUserItems, drawManagementUserSubItems, drawManagementUserItemClaims, drawManagementUserItemRoles, drawManagementClaims, drawManagementRoles } from "../devopsRemoteHostManagement/devopsManagementProvider";
import { cleanString } from "../../helpers/strings";

export class DevOpsRemoteHostsProvider implements vscode.TreeDataProvider<DevOpsTreeItem> {
  data: DevOpsTreeItem[] = [];

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

  getTreeItem(element: DevOpsTreeItem): vscode.TreeItem {
    return element;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<DevOpsTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DevOpsTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<DevOpsTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(element?: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (!element) {
        const config = Provider.getConfiguration();
        const providers = config.allRemoteHostProviders;
        for (const provider of providers) {
          const id = `${cleanString(provider.name).toLowerCase()}%%${provider.ID}`
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
            new DevOpsTreeItem(
              id,
              "",
              provider.name,
              provider.type === "orchestrator" ? "provider.remote_host.orchestrator" : "provider.remote_host.host",
              provider.name,
              provider.rawHost,
              "DevOpsRemoteHostProvider",
              `devops.remote.provider.${provider.state}`,
              collapsible,
              icon,
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
          case "provider.remote_host.orchestrator":
            this.drawOrchestratorSubItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.host":
            this.drawRemoteHostSubItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.virtual_machines":
            this.drawOrchestratorVirtualMachines(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.virtual_machines.virtual_machine":
            this.drawOrchestratorVirtualMachineHostItem(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.orchestrator.hosts":
            this.drawOrchestratorHostsItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.orchestrator.resources":
            this.drawOrchestratorResourceArchitectureItem(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.orchestrator.resources.architecture":
            this.drawOrchestratorResourceArchitectureSubItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "provider.remote_host.orchestrator.resources.architecture.total":
          case "provider.remote_host.orchestrator.resources.architecture.available":
          case "provider.remote_host.orchestrator.resources.architecture.used":
          case "provider.remote_host.orchestrator.resources.architecture.reserved":
            this.drawOrchestratorResourceArchitectureTotalResourcesItems(element).then(() => {
              resolve(this.data);
            });
            break;
          case "management":
            this.data = await drawManagementItems(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          case "management.users":
            this.data = await drawManagementUserItems(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          case "management.user":
            this.data = await drawManagementUserSubItems(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          case "management.user.claims":
            this.data = await drawManagementUserItemClaims(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          case "management.user.roles":
            this.data = await drawManagementUserItemRoles(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          case "management.claims":
            this.data = await drawManagementClaims(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          case "management.roles":
            this.data = await drawManagementRoles(element, this.data, "DevOpsRemoteHostProvider")
              return resolve(this.data);
          default:
            return resolve(this.data);
        }
      }
    });
  }

  drawOrchestratorSubItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.orchestrator") {
        const elementId = element.id.split("%%")[1];
        const provider = Provider.getConfiguration().findRemoteHostProviderById(elementId);
        const hostsLength = provider?.hosts?.length ?? 0;
        const virtualMachinesLength = provider?.virtualMachines?.length ?? 0;
        const isSuperUser = provider?.user?.isSuperUser ?? false;
        if (isSuperUser) {
          this.data.push(
            new DevOpsTreeItem(
              `${elementId}%%management`,
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
        this.data.push(
          new DevOpsTreeItem(
            `${elementId}%%resources`,
            elementId,
            "Resources",
            "provider.remote_host.orchestrator.resources",
            "Resources",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.orchestrator.resources",
            hostsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_resources"
          )
        );
        this.data.push(
          new DevOpsTreeItem(
            `${elementId}%%hosts`,
            elementId,
            "Hosts",
            "provider.remote_host.orchestrator.hosts",
            "Hosts",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.orchestrator.hosts",
            hostsLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "remote_hosts_provider_orchestrator_hosts"
          )
        );
        this.data.push(
          new DevOpsTreeItem(
            `${elementId}%%virtual_machines`,
            elementId,
            "Virtual Machines",
            "provider.remote_host.virtual_machines",
            "Virtual Machines",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.orchestrator.virtual_machines",
            virtualMachinesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "group"
          )
        );
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorResourceArchitectureItem(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.orchestrator.resources") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const resource of provider.resources ?? []) {
            const id = `${element.id}%%${resource.cpu_type}`
            this.data.push(
              new DevOpsTreeItem(
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

      return resolve(this.data);
    });
  }

  drawOrchestratorResourceArchitectureSubItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.orchestrator.resources.architecture") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const architectureId = element.id.split("%%")[2];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const resource of provider.resources ?? []) {
            if (resource.cpu_type !== architectureId) {
              continue;
            }
            this.data.push(
              new DevOpsTreeItem(
                `${element.id}%%resources_total`,
                elementId,
                "Total",
                "provider.remote_host.orchestrator.resources.architecture.total",
                "Total Resources",
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.orchestrator.resources.total",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
            this.data.push(
              new DevOpsTreeItem(
                `${element.id}%%resources_available`,
                elementId,
                "Available",
                "provider.remote_host.orchestrator.resources.architecture.available",
                "Total Available Resources",
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.orchestrator.resources.total_available",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
            this.data.push(
              new DevOpsTreeItem(
                `${element.id}%%resources_used`,
                elementId,
                "Used",
                "provider.remote_host.orchestrator.resources.architecture.used",
                "Total Used Resources",
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.orchestrator.resources.total_used",
                vscode.TreeItemCollapsibleState.Collapsed,
                "remote_hosts_provider_orchestrator_resources"
              )
            );
            this.data.push(
              new DevOpsTreeItem(
                `${element.id}%%resources_reserved`,
                elementId,
                "Reserved",
                "provider.remote_host.orchestrator.resources.architecture.reserved",
                "Total Reserved Resources",
                "",
                "DevOpsRemoteHostProvider",
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

  drawOrchestratorResourceArchitectureTotalResourcesItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element) {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const architectureId = element.id.split("%%")[2];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const resource of provider.resources ?? []) {
            if (resource.cpu_type !== architectureId) {
              continue;
            }

            let cpuTotal = 0;
            let memoryTotal = 0
            if (element.type === "provider.remote_host.orchestrator.resources.architecture.total") {
              cpuTotal = resource["total"].logical_cpu_count ?? 0;
              memoryTotal = resource["total"].memory_size ?? 0;
            } else if (element.type === "provider.remote_host.orchestrator.resources.architecture.available") {
              cpuTotal = resource["total_available"].logical_cpu_count ?? 0;
              memoryTotal = resource["total_available"].memory_size ?? 0;
            } else if (element.type === "provider.remote_host.orchestrator.resources.architecture.used") {
              cpuTotal = resource["total_in_use"].logical_cpu_count ?? 0;
              memoryTotal = resource["total_in_use"].memory_size ?? 0;
            } else if (element.type === "provider.remote_host.orchestrator.resources.architecture.reserved") {
              cpuTotal = resource["total_reserved"].logical_cpu_count ?? 0;
              memoryTotal = resource["total_reserved"].memory_size ?? 0;
            }
            this.data.push(
              new DevOpsTreeItem(
                `${element.id}%%cpu`,
                elementId,
                `CPU: ${cpuTotal} Cores`,
                element.type,
                `CPU: ${cpuTotal} Cores`,
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.orchestrator.resources.architecture.total",
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_cpu"
              )
            );
            this.data.push(
              new DevOpsTreeItem(
                `${element.id}%%memory`,
                elementId,
                `Memory: ${memoryTotal} Mb`,
                element.type,
                `Memory: ${memoryTotal} Mb`,
                "",
                "DevOpsRemoteHostProvider",
                "devops.remote.orchestrator.resources.architecture.total",
                vscode.TreeItemCollapsibleState.None,
                "remote_hosts_provider_orchestrator_resources_memory"
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorHostsItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.orchestrator.hosts") {
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
            const id = `${provider.ID}%%hosts%%${host.id}`
            const context = `devops.remote.orchestrator.host_${host.state}_${host.enabled ? "enabled" : "disabled"}`
            this.data.push(
              new DevOpsTreeItem(
                id,
                element.id,
                host.description,
                "provider.remote_host.orchestrator.hosts.host",
                host.description,
                host.cpu_model,
                "DevOpsRemoteHostProvider",
                context,
                vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorVirtualMachines(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.virtual_machines") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const provider = config.findRemoteHostProviderById(elementId);
        if (provider) {
          for (const virtualMachine of provider.virtualMachines.sort((a, b) => a.Name.localeCompare(b.Name))) {
            let icon = "virtual_machine"
            if (virtualMachine.State === "running") {
              icon = `virtual_machine_running`;
            } else if (virtualMachine.State === "paused" || virtualMachine.State === "suspended") {
              icon = `virtual_machine_paused`;
            }
            const id = `${elementId}%%${virtualMachine.host_id ? virtualMachine.host_id: "local" }%%virtual_machines%%${virtualMachine.ID}`
            this.data.push(
              new DevOpsTreeItem(
                id,
                element.id,
                virtualMachine.Name,
                "provider.remote_host.virtual_machines.virtual_machine",
                virtualMachine.Name,
                virtualMachine.State,
                "DevOpsRemoteHostProvider",
                `devops.remote.orchestrator.virtual_machine.${virtualMachine.State}`,
                provider.type === "orchestrator" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawRemoteHostSubItems(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.host") {
        const elementId = element.id.split("%%")[1];
        const provider = Provider.getConfiguration().findRemoteHostProviderById(elementId);
        const virtualMachinesLength = provider?.virtualMachines?.length ?? 0;
        const isSuperUser = provider?.user?.isSuperUser ?? false;
        if (provider?.hardwareInfo) {
          this.data.push(
            new DevOpsTreeItem(
              `${elementId}%%hardware`,
              elementId,
              provider.hardwareInfo.cpu_brand,
              "provider.remote_host.host.hardware",
              `Hardware: ${provider.hardwareInfo.cpu_brand} | ${provider.hardwareInfo.cpu_type}`,
              "",
              "DevOpsRemoteHostProvider",
              "devops.remote.hardware",
              vscode.TreeItemCollapsibleState.None,
              "remote_hosts_provider_orchestrator_resources_architecture"
            )
          );
        }
        if (isSuperUser) {
          this.data.push(
            new DevOpsTreeItem(
              `${elementId}%%management`,
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
        this.data.push(
          new DevOpsTreeItem(
            `${elementId}%%virtual_machines`,
            elementId,
            "Virtual Machines",
            "provider.remote_host.virtual_machines",
            "Virtual Machines",
            "",
            "DevOpsRemoteHostProvider",
            "devops.remote.orchestrator.virtual_machines",
            virtualMachinesLength > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            "group"
          )
        );
      }

      return resolve(this.data);
    });
  }

  drawOrchestratorVirtualMachineHostItem(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.virtual_machines.virtual_machine") {
        const config = Provider.getConfiguration();
        const elementId = element.id.split("%%")[0];
        const machineID = element.id.split("%%")[3];
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
              new DevOpsTreeItem(
                `${element.id}%%host`,
                element.id,
                virtualMachine.host,
                "provider.remote_host.orchestrator.hosts.host",
                host?.description ?? virtualMachine.host,
                virtualMachine.host,
                "DevOpsRemoteHostProvider",
                "devops.remote.provider.virtual_machine.host",
                vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }

  drawRemoteHostVirtualMachineItem(element: DevOpsTreeItem): Thenable<DevOpsTreeItem[]> {
    return new Promise(async (resolve, reject) => {
      this.data = [];
      if (element && element.type === "provider.remote_host.orchestrator.hosts.host") {
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
              new DevOpsTreeItem(
                id,
                elementId,
                virtualMachine.Name,
                "provider.remote_host.virtual_machines.virtual_machine",
                virtualMachine.Name,
                virtualMachine.State,
                "DevOpsRemoteHostProvider",
                `devops.remote.host.virtual_machine.${virtualMachine.State}`,
                vscode.TreeItemCollapsibleState.None,
                icon
              )
            );
          }
        }
      }

      return resolve(this.data);
    });
  }
}
