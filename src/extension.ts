import * as vscode from "vscode";
import {
  startMyVirtualMachinesAutoRefresh,
  stopMyVirtualMachinesAutoRefresh,
  VirtualMachineProvider
} from "./tree/virtualMachinesProvider/virtualMachineProvider";
import {Provider} from "./ioc/provider";
import {initialize} from "./initialization";
import {
  CommandsFlags,
  FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED,
  FLAG_IS_HEADLESS_DEFAULT,
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
import {ConfigurationService} from "./services/configurationService";
import {randomUUID} from "crypto";
import {TELEMETRY_PARALLELS_CATALOG} from "./telemetry/operations";
import {TelemetryService} from "./telemetry/telemetryService";
import {registerClearDownloadCacheCommand} from "./commands/clearDownloads";
import {stopVagrantBoxesAutoRefresh} from "./tree/vagrantBoxProvider/vagrantBoxProvider";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Activating Parallels Desktop Extension");

  const provider = new Provider(context);
  const os = Provider.getOs();

  vscode.commands.executeCommand("setContext", FLAG_OS, os.toLowerCase());
  const config = Provider.getConfiguration();
  if (config.id === undefined) {
    config.id = randomUUID().replace(/-/g, "");
  }
  config.save();

  const telemetry = Provider.telemetry();

  // Registering our URI
  const parallelsScheme = "parallels";
  const myProvider = new (class implements vscode.TextDocumentContentProvider {
    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;
    provideTextDocumentContent(uri: vscode.Uri): string {
      return `test`;
    }
  })();
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(parallelsScheme, myProvider));

  // Registering the common commands
  AllCommonCommand.forEach(c => c.register(context));

  console.log(`OS: ${os}`);
  // Initializing the DevOps Catalog Provider
  new DevOpsCatalogProvider(context);

  // Initializing the DevOps Remote Provider
  const devopsRemoteProvider = new DevOpsRemoteHostsProvider(context);
  AllDevopsRemoteProviderManagementCommands.forEach(c => c.register(context, devopsRemoteProvider));

  // Checking licensing and configuring providers based on the licensing
  if (os.toLowerCase() === "darwin") {
    initLicensing(context, telemetry, config);
    // Initializing the extension
    await initialize(context);
  }

  // initializeCopilot(context);
  console.log("Initializing Parallels Desktop Copilot...");
  initializeCopilot(context);

  if (config.isDebugEnabled) {
    LogService.info("Debug mode is enabled", "CoreService");
  }

  vscode.commands.executeCommand("setContext", FLAG_PARALLELS_EXTENSION_INITIALIZED, true);
  vscode.commands.executeCommand("setContext", FLAG_DEVOPS_CATALOG_PROVIDER_INITIALIZED, true);

  if (config.isTelemetryEnabled) {
    LogService.info("Telemetry is enabled", "CoreService");
  } else {
    LogService.info("Telemetry is disabled", "CoreService");
  }

  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration("parallels-desktop")) {
      console.log("Parallels Desktop configuration changed, re-initializing the extension");
      // Re-initialize the extension
      if (os.toLowerCase() === "darwin") {
        stopMyVirtualMachinesAutoRefresh();
        const settings = Provider.getSettings();

        // Setting the headless flag to update the context menu
        if (settings.get<boolean>(FLAG_START_VMS_HEADLESS_DEFAULT)) {
          vscode.commands.executeCommand("setContext", FLAG_IS_HEADLESS_DEFAULT, true);
        } else {
          vscode.commands.executeCommand("setContext", FLAG_IS_HEADLESS_DEFAULT, false);
        }

        startMyVirtualMachinesAutoRefresh();
        vscode.commands.executeCommand(CommandsFlags.treeRefreshVms);
      }
    }
  });

  config.save();
  console.log("Parallels Desktop Extension is now active!");
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Deactivating Parallels Desktop Extension");
  // const config = Provider.getConfiguration();
  // config.save();
  stopMyVirtualMachinesAutoRefresh();
  stopVagrantBoxesAutoRefresh();
  DevOpsService.stopParallelsCatalogViewAutoRefresh();
  DevOpsService.stopRemoteHostsViewAutoRefresh();
  DevOpsService.stopCatalogViewAutoRefresh();
}

async function initLicensing(
  context: vscode.ExtensionContext,
  telemetry: TelemetryService,
  config: ConfigurationService
) {
  console.log("Checking for Parallels Desktop licensing and availability");
  const license = await ConfigurationService.getJsonLicense();
  if (license === undefined || license === null) {
    vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, false);
    telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "LICENSE_NOT_FOUND", {
      description: `Could not find license`
    });

    return;
  }

  console.log(`Found licensed edition: ${license?.full_edition}`);

  vscode.commands.executeCommand("setContext", FLAG_LICENSE, license.edition);
  config.license_edition = license.edition;
  // creating the virtual machine provider
  new VirtualMachineProvider(context, license);
  // Registering global commands
  if (license.edition === "pro" || license.edition === "professional" || license.edition === "business") {
    registerClearDownloadCacheCommand(context);
  }
}
