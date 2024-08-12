import {ParallelsCatalogProvider} from "./tree/parallelsCatalogProvider/parallelsCatalogProvider";
import * as vscode from "vscode";
import {VirtualMachineProvider} from "./tree/virtualMachinesProvider/virtualMachineProvider";
import {Provider} from "./ioc/provider";
import {initialize} from "./initialization";
import {registerClearDownloadCacheCommand} from "./commands/clearDownloads";
import {VagrantBoxProvider} from "./tree/vagrantBoxProvider/vagrantBoxProvider";
import {
  CommandsFlags,
  FLAG_AUTO_REFRESH,
  FLAG_AUTO_REFRESH_INTERVAL,
  FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED,
  FLAG_IS_HEADLESS_DEFAULT,
  FLAG_IS_LICENSED_SHOW_CATALOG,
  FLAG_IS_PARALLELS_CATALOG_OFFLINE,
  FLAG_LICENSE,
  FLAG_OS,
  FLAG_PARALLELS_EXTENSION_INITIALIZED,
  FLAG_SHOW_PARALLELS_CATALOG,
  FLAG_START_VMS_HEADLESS_DEFAULT
} from "./constants/flags";
import {LogService} from "./services/logService";
import {DevOpsCatalogProvider} from "./tree/devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRemoteHostsProvider} from "./tree/devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsService} from "./services/devopsService";
import {AllCommonCommand, AllDevopsRemoteProviderManagementCommands} from "./tree/commands/AllCommands";
import {initializeCopilot} from "./copilotInitialization";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {ParallelsDesktopLicense} from "./models/parallels/ParallelsDesktopLicense";
import {
  PARALLELS_CATALOG_BUSINESS_PASSWORD,
  PARALLELS_CATALOG_BUSINESS_USER,
  PARALLELS_CATALOG_PRO_PASSWORD,
  PARALLELS_CATALOG_PRO_USER,
  PARALLELS_CATALOG_URL
} from "./services/configurationService";

let autoRefreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log("Activating Parallels Desktop Extension");
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
  AllCommonCommand.forEach(c => c.register(context));

  // Initializing the DevOps Catalog Provider
  const devopsCatalogProvider = new DevOpsCatalogProvider(context);

  // Registering the  Virtual Machine Provider
  if (os.toLowerCase() === "darwin") {
    const config = Provider.getConfiguration();
    let licenseInfo: ParallelsDesktopLicense | null = null;
    if (config.parallelsDesktopServerInfo && config.parallelsDesktopServerInfo.License) {
      licenseInfo = config.parallelsDesktopServerInfo.License;
    } else {
      const serverInfo = await ParallelsDesktopService.getServerInfo();
      if (serverInfo) {
        licenseInfo = serverInfo.License;
      }
    }
    if (!licenseInfo) {
      vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, false);
    } else {
      let businessUsername = PARALLELS_CATALOG_BUSINESS_USER;
      let businessPassword = PARALLELS_CATALOG_BUSINESS_PASSWORD;
      let proUsername = PARALLELS_CATALOG_PRO_USER;
      let proPassword = PARALLELS_CATALOG_PRO_PASSWORD;
      let parallelsCatalogUrl = PARALLELS_CATALOG_URL;

      // for local development
      if (!parallelsCatalogUrl) {
        parallelsCatalogUrl = process.env.PARALLELS_CATALOG_URL || "";
      }
      if (!proUsername) {
        proUsername = proUsername = process.env.PARALLELS_CATALOG_PRO_USER || "";
      }
      if (!proPassword) {
        proPassword = process.env.PARALLELS_CATALOG_PRO_PASSWORD || "";
      }
      if (!businessUsername) {
        businessUsername = process.env.PARALLELS_CATALOG_BUSINESS_USER || "";
      }
      if (!businessPassword) {
        businessPassword = process.env.PARALLELS_CATALOG_BUSINESS_PASSWORD || "";
      }

      try {
        const isHostAvailable = await DevOpsService.testHost(config.parallelsCatalogProvider);
        if (!isHostAvailable) {
          vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
        }
      } catch (error) {
        vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
      }
        vscode.commands.executeCommand("setContext", FLAG_LICENSE, licenseInfo.edition);
        config.license_edition = licenseInfo.edition;
        const virtualMachineProvider = new VirtualMachineProvider(context);
      if (parallelsCatalogUrl) {
        vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, true);
        const parallelsCatalogProvider = new ParallelsCatalogProvider(context);
        if (licenseInfo.edition === "business" && licenseInfo.is_volume === "yes") {
          config.parallelsCatalogProvider.rawHost = parallelsCatalogUrl;
          config.parallelsCatalogProvider.username = businessUsername;
          config.parallelsCatalogProvider.password = businessPassword;
          config.parallelsCatalogProvider.authToken = "";

          config.parallelsCatalogProvider.manifests = [];
          if (parallelsCatalogUrl && businessUsername && businessPassword) {
            DevOpsService.startParallelsCatalogViewAutoRefresh();
            await DevOpsService.refreshParallelsCatalogProvider(true);
            vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
          }
        } else if (licenseInfo.edition === "pro") {
          config.parallelsCatalogProvider.rawHost = parallelsCatalogUrl;
          config.parallelsCatalogProvider.username = proUsername;
          config.parallelsCatalogProvider.password = proPassword;
          config.parallelsCatalogProvider.authToken = "";

          config.parallelsCatalogProvider.manifests = [];
          if (parallelsCatalogUrl && proUsername && proPassword) {
            DevOpsService.startParallelsCatalogViewAutoRefresh();
            await DevOpsService.refreshParallelsCatalogProvider(true);
            vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
          }
        } else {
          config.parallelsCatalogProvider.manifests = [];
          config.parallelsCatalogProvider.rawHost = "";
          config.parallelsCatalogProvider.username = "";
          config.parallelsCatalogProvider.password = "";
          config.parallelsCatalogProvider.authToken = "";
          vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, false);
        }
      } else {
        vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, false);
      }
    }
  }

  vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
  DevOpsService.startCatalogViewAutoRefresh();

  // Initializing the DevOps Remote Provider
  const devopsRemoteProvider = new DevOpsRemoteHostsProvider(context);
  vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
  new DevOpsService(context);
  DevOpsService.startRemoteHostsViewAutoRefresh();

  AllDevopsRemoteProviderManagementCommands.forEach(c => c.register(context, devopsRemoteProvider));

  if (os === "darwin") {
    // Initializing the extension
    await initialize();
  }

  const config = Provider.getConfiguration();
  if (os === "darwin") {
    if (config.tools.vagrant?.isInstalled) {
      const vagrantBoxProvider = new VagrantBoxProvider(context);
    }

    if (
      config.parallelsDesktopServerInfo?.License?.edition === "pro" ||
      config.parallelsDesktopServerInfo?.License?.edition === "business"
    ) {
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
    }
  }

  if (config.isDebugEnabled) {
    LogService.info("Debug mode is enabled", "CoreService");
  }

  // initializeCopilot(context);
  console.log("Initializing Copilot");
  initializeCopilot(context);

  vscode.commands.executeCommand("setContext", FLAG_PARALLELS_EXTENSION_INITIALIZED, true);
  vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED, true);
  vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED, true);

  // Send telemetry event
  LogService.sendHeartbeat();
  const telemetry = Provider.telemetry();
  telemetry.sendHeartbeat();

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
