import * as vscode from "vscode";
import {PackerService} from "./services/packerService";
import {VagrantService} from "./services/vagrantService";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {Provider} from "./ioc/provider";
import {SettingsFlags} from "./constants/flags";
import {LogService} from "./services/logService";

export async function initialize() {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Parallels Desktop",
      cancellable: false
    },
    async (progress, token) => {
      const config = Provider.getConfiguration();
      const settings = Provider.getSettings();
      progress.report({message: "Parallels Desktop: Checking for Parallels Desktop"});
      const isParallelsInstalled = await ParallelsDesktopService.isParallelsDesktopInstalled();
      if (!isParallelsInstalled) {
        const options: string[] = [];
        options.push("Install Parallels Desktop");
        options.push("Download Parallels Desktop");
        vscode.window
          .showErrorMessage(
            "Parallels Desktop is not installed, please install Parallels Desktop and try again.",
            "Open Parallels Desktop Website",
            ...options
          )
          .then(selection => {
            if (selection === "Install Parallels Desktop") {
              ParallelsDesktopService.install();
              return;
            }
            if (selection === "Download Parallels Desktop") {
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse("https://www.parallels.com/products/desktop/")
              );
              return;
            }
          });
      }

      progress.report({message: "Checking for Packer tool"});
      let isPackerInstalled = await PackerService.isInstalled();
      progress.report({message: "Checking for Vagrant tool"});
      let isVagrantInstalled = await VagrantService.isInstalled();

      if (!isPackerInstalled || !isVagrantInstalled) {
        const options: string[] = [];
        if (!isPackerInstalled && !isVagrantInstalled) {
          options.push("Install Dependencies");
        } else {
          if (!isPackerInstalled) {
            options.push("Install Packer");
          }
          if (!isVagrantInstalled) {
            options.push("Install Vagrant");
          }
        }
        vscode.window
          .showErrorMessage(
            "Packer or Vagrant is not installed, please install Packer and Vagrant and try again.",
            ...options
          )
          .then(selection => {
            if (selection === "Install Dependencies") {
              PackerService.install().then(result => {
                if (result) {
                  isPackerInstalled = true;
                  vscode.window.showInformationMessage("Packer installed successfully");
                } else {
                  vscode.window.showErrorMessage("Packer installation failed");
                }
              });
              VagrantService.install().then(result => {
                if (result) {
                  isVagrantInstalled = true;
                  vscode.window.showInformationMessage("Vagrant installed successfully");
                } else {
                  vscode.window.showErrorMessage("Vagrant installation failed");
                }
              });
            } else {
              if (selection === "Install Packer") {
                PackerService.install().then(result => {
                  if (result) {
                    isPackerInstalled = true;
                    vscode.window.showInformationMessage("Packer installed successfully");
                  } else {
                    vscode.window.showErrorMessage("Packer installation failed");
                  }
                });
              } else if (selection === "Install Vagrant") {
                VagrantService.install().then(result => {
                  if (result) {
                    vscode.window.showInformationMessage("Vagrant installed successfully");
                    isVagrantInstalled = true;
                  } else {
                    vscode.window.showErrorMessage("Vagrant installation failed");
                  }
                });
              }
            }
          });
        return;
      }

      // Setting the default show hidden items based on settings
      const showHidden = settings.get<boolean>(SettingsFlags.treeShowHiddenItems);
      if (showHidden) {
        config.showHidden = true;
        vscode.commands.executeCommand("setContext", "parallels-desktop:enableShowHidden", true);
        vscode.commands.executeCommand("setContext", "parallels-desktop:disableShowHidden", false);
      } else {
        config.showHidden = false;
        vscode.commands.executeCommand("setContext", "parallels-desktop:enableShowHidden", false);
        vscode.commands.executeCommand("setContext", "parallels-desktop:disableShowHidden", true);
      }
      // show the snapshot flat tree based on settings
      config.showFlatSnapshotsList = settings.get<boolean>(SettingsFlags.treeShowFlatSnapshotList) ?? false;

      vscode.commands.executeCommand("setContext", "parallels-desktop:vagrant", true);
      if (isPackerInstalled) {
        vscode.commands.executeCommand("setContext", "parallels-desktop:packer", true);
      }
      if (isVagrantInstalled) {
        vscode.commands.executeCommand("setContext", "parallels-desktop:vagrant", true);
      }
      if (isParallelsInstalled) {
        vscode.commands.executeCommand("setContext", "parallels-desktop:parallels", true);
      }
      progress.report({message: "Initializing Configuration"});
      await config.init();

      if (config.isTelemetryEnabled === undefined) {
        const options = ["Yes", "No"];
        vscode.window
          .showErrorMessage(
            "Help us improve the Parallels Desktop extension by allowing anonymous usage data to be sent to Parallels.\nFind more on https://www.alludo.com/legal/privacy",
            ...options
          )
          .then(selection => {
            if (selection === "Yes") {
              config.featureFlags.enableTelemetry = true;
              LogService.info("Telemetry is enabled");
            } else {
              config.featureFlags.enableTelemetry = false;
              LogService.info("Telemetry is disabled");
            }
          });
      } else {
        LogService.info(`Telemetry is ${config.isTelemetryEnabled ? "enabled" : "disabled"}`, "CoreService");
      }

      if (isParallelsInstalled) {
        progress.report({message: "Checking for Virtual Machines"});
        await ParallelsDesktopService.getVms();
        progress.report({message: "Finished"});
      }
    }
  );
}
