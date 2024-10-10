import {ParallelsCatalogProvider} from "./tree/parallelsCatalogProvider/parallelsCatalogProvider";
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
  FLAG_IS_LICENSED_SHOW_CATALOG,
  FLAG_IS_PARALLELS_CATALOG_OFFLINE,
  FLAG_LICENSE,
  FLAG_OS,
  FLAG_PARALLELS_CATALOG_SHOW_ONBOARD,
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
import {
  ConfigurationService,
  PARALLELS_CATALOG_BUSINESS_PASSWORD,
  PARALLELS_CATALOG_BUSINESS_USER,
  PARALLELS_CATALOG_PRO_PASSWORD,
  PARALLELS_CATALOG_PRO_USER,
  PARALLELS_CATALOG_URL
} from "./services/configurationService";
import {randomUUID} from "crypto";
import {TELEMETRY_PARALLELS_CATALOG} from "./telemetry/operations";
import {TelemetryService} from "./telemetry/telemetryService";
import {registerClearDownloadCacheCommand} from "./commands/clearDownloads";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
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

  // setting the parallels catalog users from the environment variables
  let businessUsername = PARALLELS_CATALOG_BUSINESS_USER;
  let businessPassword = PARALLELS_CATALOG_BUSINESS_PASSWORD;
  let proUsername = PARALLELS_CATALOG_PRO_USER;
  let proPassword = PARALLELS_CATALOG_PRO_PASSWORD;
  let parallelsCatalogUrl = PARALLELS_CATALOG_URL;

  // for local development
  parallelsCatalogUrl = parallelsCatalogUrl.trim();
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

  vscode.commands.executeCommand("setContext", FLAG_LICENSE, license.edition);
  config.license_edition = license.edition;

  // creating the virtual machine provider
  new VirtualMachineProvider(context, license);

  // Checking if we should show the new Parallels Catalog
  if (parallelsCatalogUrl) {
    vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, true);
    if (license.edition === "business") {
      config.parallelsCatalogProvider.rawHost = parallelsCatalogUrl;
      config.parallelsCatalogProvider.username = businessUsername;
      config.parallelsCatalogProvider.password = businessPassword;
      config.parallelsCatalogProvider.authToken = "";

      config.parallelsCatalogProvider.manifests = [];
      try {
        const isHostAvailable = await DevOpsService.testHost(config.parallelsCatalogProvider);
        if (!isHostAvailable) {
          vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
        }
      } catch (error) {
        vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
      }
      if (config.showOnboardingForParallelsCatalog) {
        vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_SHOW_ONBOARD, true);
        vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
      } else {
        if (parallelsCatalogUrl && businessUsername && businessPassword) {
          vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
        }
      }
    } else if (license.edition === "pro" || license.edition === "professional") {
      config.parallelsCatalogProvider.rawHost = parallelsCatalogUrl;
      config.parallelsCatalogProvider.username = proUsername;
      config.parallelsCatalogProvider.password = proPassword;
      config.parallelsCatalogProvider.authToken = "";

      config.parallelsCatalogProvider.manifests = [];
      try {
        const isHostAvailable = await DevOpsService.testHost(config.parallelsCatalogProvider);
        if (!isHostAvailable) {
          vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
        }
      } catch (error) {
        vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
      }
      if (config.showOnboardingForParallelsCatalog) {
        vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_SHOW_ONBOARD, true);
        vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
      } else {
        if (parallelsCatalogUrl && proUsername && proPassword) {
          vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
        }
      }
    } else {
      config.parallelsCatalogProvider.manifests = [];
      config.parallelsCatalogProvider.rawHost = "";
      config.parallelsCatalogProvider.username = "";
      config.parallelsCatalogProvider.password = "";
      config.parallelsCatalogProvider.authToken = "";
      vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, false);
    }

    let autoRefresh = false;
    if (
      (parallelsCatalogUrl && proUsername && proPassword) ||
      (parallelsCatalogUrl && businessUsername && businessPassword)
    ) {
      console.log("Setting Parallels Catalog Auto Refresh");
      autoRefresh = true;
    }
    new ParallelsCatalogProvider(context, autoRefresh);
  } else {
    vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, false);
  }

  // Registering global commands
  if (license.edition === "pro" || license.edition === "professional" || license.edition === "business") {
    registerClearDownloadCacheCommand(context);
  }
}

async function initLicensingOld(
  context: vscode.ExtensionContext,
  telemetry: TelemetryService,
  config: ConfigurationService
) {
  console.log("Checking for Parallels Desktop licensing and availability");
  const foundLicensedEdition = await ConfigurationService.getLicenseType();
  const license = await ConfigurationService.getJsonLicense();
  console.log(`Found licensed edition: ${foundLicensedEdition}`);

  if (!foundLicensedEdition) {
    vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, false);
    telemetry.sendOperationEvent(TELEMETRY_PARALLELS_CATALOG, "LICENSE_NOT_FOUND", {
      description: `foundLicensedEdition: ${foundLicensedEdition}`,
      operationValue: foundLicensedEdition
    });
    console.log(`License not found, ${foundLicensedEdition} `);
  } else {
    let businessUsername = PARALLELS_CATALOG_BUSINESS_USER;
    let businessPassword = PARALLELS_CATALOG_BUSINESS_PASSWORD;
    let proUsername = PARALLELS_CATALOG_PRO_USER;
    let proPassword = PARALLELS_CATALOG_PRO_PASSWORD;
    let parallelsCatalogUrl = PARALLELS_CATALOG_URL;

    // for local development
    parallelsCatalogUrl = parallelsCatalogUrl.trim();
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

    vscode.commands.executeCommand("setContext", FLAG_LICENSE, foundLicensedEdition);
    config.license_edition = foundLicensedEdition;
    new VirtualMachineProvider(context, license);
    if (parallelsCatalogUrl) {
      vscode.commands.executeCommand("setContext", FLAG_SHOW_PARALLELS_CATALOG, true);
      if (foundLicensedEdition === "business") {
        config.parallelsCatalogProvider.rawHost = parallelsCatalogUrl;
        config.parallelsCatalogProvider.username = businessUsername;
        config.parallelsCatalogProvider.password = businessPassword;
        config.parallelsCatalogProvider.authToken = "";

        config.parallelsCatalogProvider.manifests = [];
        try {
          const isHostAvailable = await DevOpsService.testHost(config.parallelsCatalogProvider);
          if (!isHostAvailable) {
            vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
          }
        } catch (error) {
          vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
        }
        if (config.showOnboardingForParallelsCatalog) {
          vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_SHOW_ONBOARD, true);
          vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
        } else {
          if (parallelsCatalogUrl && businessUsername && businessPassword) {
            DevOpsService.startParallelsCatalogViewAutoRefresh();
            await DevOpsService.refreshParallelsCatalogProvider(true);
            vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
          }
        }
      } else if (foundLicensedEdition === "pro" || foundLicensedEdition === "professional") {
        config.parallelsCatalogProvider.rawHost = parallelsCatalogUrl;
        config.parallelsCatalogProvider.username = proUsername;
        config.parallelsCatalogProvider.password = proPassword;
        config.parallelsCatalogProvider.authToken = "";

        config.parallelsCatalogProvider.manifests = [];
        try {
          const isHostAvailable = await DevOpsService.testHost(config.parallelsCatalogProvider);
          if (!isHostAvailable) {
            vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
          }
        } catch (error) {
          vscode.commands.executeCommand("setContext", FLAG_IS_PARALLELS_CATALOG_OFFLINE, true);
        }
        if (config.showOnboardingForParallelsCatalog) {
          vscode.commands.executeCommand("setContext", FLAG_PARALLELS_CATALOG_SHOW_ONBOARD, true);
          vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
        } else {
          if (parallelsCatalogUrl && proUsername && proPassword) {
            DevOpsService.startParallelsCatalogViewAutoRefresh();
            await DevOpsService.refreshParallelsCatalogProvider(true);
            vscode.commands.executeCommand("setContext", FLAG_IS_LICENSED_SHOW_CATALOG, true);
          }
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
