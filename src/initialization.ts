import * as vscode from "vscode";
import {PackerService} from "./services/packerService";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {Provider} from "./ioc/provider";
import {
  Constants,
  FLAG_DISABLE_SHOW_HIDDEN,
  FLAG_ENABLE_SHOW_HIDDEN,
  FLAG_EXTENSION_SHOW_FLAT_SNAPSHOT_TREE,
  FLAG_IS_HEADLESS_DEFAULT,
  FLAG_PACKER_RECIPES_CACHED,
  FLAG_START_VMS_HEADLESS_DEFAULT,
  FLAG_TREE_SHOW_HIDDEN
} from "./constants/flags";
import {LogService} from "./services/logService";
import {GitService} from "./services/gitService";
import {ANSWER_YES, YesNoErrorMessage} from "./helpers/ConfirmDialog";
import {VagrantBoxProvider} from "./tree/vagrantBoxProvider/vagrantBoxProvider";
import {ParallelsShortLicense} from "./models/parallels/ParallelsJsonLicense";

export async function initialize(context: vscode.ExtensionContext) {
  const config = Provider.getConfiguration();
  const settings = Provider.getSettings();

  await config.init();

  // Initializing the Vagrant Box Provider
  if (config.tools.vagrant?.isInstalled) {
    new VagrantBoxProvider(context);
  }

  if (!config.tools.parallelsDesktop.isInstalled) {
    const options: string[] = [];
    if (config.tools.brew.isInstalled) {
      options.push("Install Parallels Desktop");
    }
    options.push("Download Parallels Desktop");
    vscode.window
      .showErrorMessage(
        "Parallels Desktop is not installed, please install Parallels Desktop and try again.",
        "Open Parallels Desktop Website",
        ...options
      )
      .then(selection => {
        if (selection === "Open Parallels Desktop Website") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse("https://www.parallels.com/products/desktop/pro/")
          );
          return;
        }
        if (selection === "Install Parallels Desktop") {
          ParallelsDesktopService.install();
          return;
        }
        if (selection === "Download Parallels Desktop") {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse("https://www.parallels.com/products/desktop/download/")
          );
          return;
        }
      });
  }

  if (config.tools.git.isInstalled && config.tools.packer.isInstalled) {
    // Cloning Packer example repo, need to wait to allow background process to finish
    GitService.cloneOrUpdatePackerExamples()
      .then(() => {
        // Caching Packer Addons
        if (config.tools.packer.isInstalled && config.tools.git.isInstalled && config.packerTemplatesCloned) {
          const platforms = ["windows", "ubuntu", "macos"];
          platforms.forEach(platform => {
            const addons = PackerService.getPlatformAddons(platform);
            Provider.getCache().set(`${Constants.CacheFlagPackerAddons}.${platform}`, addons);
          });
        }
        vscode.commands.executeCommand("setContext", FLAG_PACKER_RECIPES_CACHED, true);
        config.tools.packer.isCached = false;
      })
      .catch(error => {
        LogService.error(error, "CoreService");
        config.tools.packer.isCached = false;
        vscode.commands.executeCommand("setContext", FLAG_PACKER_RECIPES_CACHED, false);
      });
  }

  // Setting the default show hidden items based on settings
  const showHidden = settings.get<boolean>(FLAG_TREE_SHOW_HIDDEN);
  if (showHidden) {
    config.showHidden = true;
    vscode.commands.executeCommand("setContext", FLAG_ENABLE_SHOW_HIDDEN, true);
    vscode.commands.executeCommand("setContext", FLAG_DISABLE_SHOW_HIDDEN, false);
  } else {
    config.showHidden = false;
    vscode.commands.executeCommand("setContext", FLAG_ENABLE_SHOW_HIDDEN, false);
    vscode.commands.executeCommand("setContext", FLAG_DISABLE_SHOW_HIDDEN, true);
  }
  // show the snapshot flat tree based on settings
  config.showFlatSnapshotsList = settings.get<boolean>(FLAG_EXTENSION_SHOW_FLAT_SNAPSHOT_TREE) ?? false;

  if (config.isTelemetryEnabled === undefined) {
    YesNoErrorMessage(
      "Help us improve the Parallels Desktop extension by allowing anonymous usage data to be sent to Parallels.\nFind more on https://www.parallels.com/about/legal/privacy/"
    ).then(selection => {
      if (selection === ANSWER_YES) {
        config.featureFlags.enableTelemetry = true;
        config.save();
        LogService.info("Telemetry is enabled");
      } else {
        config.featureFlags.enableTelemetry = false;
        config.save();
        LogService.info("Telemetry is disabled");
      }
    });
  } else {
    LogService.info(`Telemetry is ${config.isTelemetryEnabled ? "enabled" : "disabled"}`, "CoreService");
  }

  const telemetry = Provider.telemetry();

  telemetry.setLicenseEdition(config.parallelsDesktopServerInfo?.License?.edition ?? "Unknown");
  telemetry.setLicense(config.parallelsDesktopServerInfo?.License?.serial ?? "Unknown");

  // Setting the headless flag to update the context menu
  if (settings.get<boolean>(FLAG_START_VMS_HEADLESS_DEFAULT)) {
    vscode.commands.executeCommand("setContext", FLAG_IS_HEADLESS_DEFAULT, true);
  } else {
    vscode.commands.executeCommand("setContext", FLAG_IS_HEADLESS_DEFAULT, false);
  }
}
