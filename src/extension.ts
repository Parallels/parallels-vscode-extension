import {config} from "process";
import * as vscode from "vscode";
import {VirtualMachineProvider} from "./tree/virtual_machine";
import {Provider} from "./ioc/provider";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {initialize} from "./initialization";
import {registerClearDownloadCacheCommand} from "./commands/clearDownloads";
import {VagrantBoxProvider} from "./tree/vagrant_boxes";
import {
  CommandsFlags,
  FLAG_AUTO_REFRESH,
  FLAG_AUTO_REFRESH_INTERVAL,
  FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED,
  FLAG_IS_HEADLESS_DEFAULT,
  FLAG_OS,
  FLAG_PARALLELS_EXTENSION_INITIALIZED,
  FLAG_START_VMS_HEADLESS_DEFAULT,
  TelemetryEventIds
} from "./constants/flags";
import {parallelsOutputChannel} from "./helpers/channel";
import {LogService} from "./services/logService";
import { DevOpsCatalogProvider } from "./tree/devops_catalog/devops_catalog";
import { DevOpsRemoteHostsTreeProvider } from "./tree/devops_remote/remote_hosts_tree_provider";
import { DevOpsService } from "./services/devopsService";

let autoRefreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const provider = new Provider(context);
  const os = Provider.getOs();
  vscode.commands.executeCommand("setContext", FLAG_OS, os);

  // Registering our URI
  const myScheme = "parallels";
  const myProvider = new (class implements vscode.TextDocumentContentProvider {
    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
      return `test`;
    }
  })();
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

  // Registering the  Virtual Machine Provider
  if (os.toLowerCase() === 'darwin') {
    const virtualMachineProvider = new VirtualMachineProvider(context);
  }

  // Initializing the DevOps Catalog Provider
  const devopsCatalogProvider = new DevOpsCatalogProvider(context);
  vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
  DevOpsService.startCatalogViewAutoRefresh();
  
  // Initializing the DevOps Remote Provider
  const devopsRemoteProvider = new DevOpsRemoteHostsTreeProvider(context);
  vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
  DevOpsService.startRemoteHostsViewAutoRefresh();
  
  // Initializing the extension
  await initialize();

  const config = Provider.getConfiguration();
  if (config.tools.vagrant?.isInstalled) {
    const vagrantBoxProvider = new VagrantBoxProvider(context);
  }


  setAutoRefresh();

  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration("parallels-desktop")) {
      // Re-initialize the extension
      setAutoRefresh();
      const settings = Provider.getSettings();
      // Setting the headless flag to update the context menu
      if (settings.get<boolean>(FLAG_START_VMS_HEADLESS_DEFAULT)) {
        vscode.commands.executeCommand("setContext", FLAG_IS_HEADLESS_DEFAULT, true);
      } else {
        vscode.commands.executeCommand("setContext", FLAG_IS_HEADLESS_DEFAULT, false);
      }
      vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
    }
  });

  // Registering global commands
  registerClearDownloadCacheCommand(context);

  if (config.isDebugEnabled) {
    LogService.info("Debug mode is enabled", "CoreService");
  }

  vscode.commands.executeCommand("setContext", FLAG_PARALLELS_EXTENSION_INITIALIZED, true);
  vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED, true);
  vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED, true);
  // Send telemetry event
  LogService.sendHeartbeat();
  if (config.isTelemetryEnabled) {
    LogService.info("Telemetry is enabled", "CoreService");
  } else {
    LogService.info("Telemetry is disabled", "CoreService");
  }
  console.log("Parallels Desktop Extension is now active!");
}

function setAutoRefresh() {
  const settings = Provider.getSettings();
  const autoRefresh = settings.get<boolean>(FLAG_AUTO_REFRESH);
  clearInterval(autoRefreshInterval);
  if (autoRefresh) {
    LogService.info("Auto refresh is enabled", "CoreService");
    let interval = settings.get<number>(FLAG_AUTO_REFRESH_INTERVAL);
    if (interval === undefined) {
      LogService.info("Auto refresh interval is not defined, setting default to 60 seconds", "CoreService");
      settings.update(FLAG_AUTO_REFRESH_INTERVAL, 60000);
      interval = 60000;
    }
    if (interval < 10000) {
      LogService.info("Auto refresh interval is too low, setting minimum to 10 seconds", "CoreService");
      settings.update(FLAG_AUTO_REFRESH_INTERVAL, 10000);
      interval = 10000;
    }

    LogService.info("Auto refresh interval is " + interval + "ms", "CoreService");
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
      LogService.info("Refreshing the virtual machine tree view", "CoreService");
      vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
      LogService.info("Refreshing the vagrant box tree view", "CoreService");
      vscode.commands.executeCommand(CommandsFlags.vagrantBoxProviderRefresh);
    }, interval);
  } else {
    if (autoRefreshInterval) {
      LogService.info("Clearing the auto refresh interval", "CoreService");
      clearInterval(autoRefreshInterval);
    }
    LogService.info("Auto refresh is disabled", "CoreService");
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Deactivating Parallels Desktop Extension");
  // const config = Provider.getConfiguration();
  // config.save();
  clearInterval(autoRefreshInterval);
}
