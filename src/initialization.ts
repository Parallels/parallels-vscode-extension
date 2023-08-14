import * as vscode from "vscode";
import {PackerService} from "./services/packerService";
import {VagrantService} from "./services/vagrantService";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {Provider} from "./ioc/provider";
import {
  Constants,
  FLAG_DISABLE_SHOW_HIDDEN,
  FLAG_ENABLE_SHOW_HIDDEN,
  FLAG_EXTENSION_SHOW_FLAT_SNAPSHOT_TREE,
  FLAG_TREE_SHOW_HIDDEN
} from "./constants/flags";
import {LogService} from "./services/logService";
import {GitService} from "./services/gitService";

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

      progress.report({message: "Initializing Configuration"});
      await config.init();

      progress.report({message: "Parallels Desktop: Checking for Parallels Desktop"});
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
                vscode.Uri.parse("https://www.parallels.com/uk/products/desktop/pro/")
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
                vscode.Uri.parse("https://www.parallels.com/uk/products/desktop/download/")
              );
              return;
            }
          });
      }

      progress.report({message: "Parallels Desktop: Checking for Hashicorp Packer"});
      if (!config.tools.packer.isInstalled) {
        const options: string[] = [];
        if (config.tools.brew.isInstalled) {
          options.push("Install Hashicorp Packer");
        }
        options.push("Download Hashicorp Packer");
        vscode.window
          .showErrorMessage(
            "Hashicorp Packer is not installed, please install Hashicorp Packer to be able to create virtual machines with Packer scripts.",
            "Open Packer Website",
            ...options
          )
          .then(selection => {
            if (selection === "Open Packer Website") {
              vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://developer.hashicorp.com/packer"));
              return;
            }
            if (selection === "Install Hashicorp Packer") {
              PackerService.install();
              return;
            }
            if (selection === "Download Hashicorp Packer") {
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse(
                  "https://developer.hashicorp.com/packer/tutorials/docker-get-started/get-started-install-cli"
                )
              );
              return;
            }
          });
      }

      progress.report({message: "Parallels Desktop: Checking for Hashicorp Vagrant"});
      if (!config.tools.vagrant.isInstalled) {
        const options: string[] = [];
        if (config.tools.brew.isInstalled) {
          options.push("Install Hashicorp Vagrant");
        }
        options.push("Download Hashicorp Vagrant");
        vscode.window
          .showErrorMessage(
            "Hashicorp Vagrant is not installed, please install Hashicorp Vagrant to be able to create and manage Vagrant Boxes.",
            "Open Vagrant Website",
            ...options
          )
          .then(selection => {
            if (selection === "Open Vagrant Website") {
              vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://www.vagrantup.com/"));
              return;
            }
            if (selection === "Install Hashicorp Vagrant") {
              VagrantService.install();
              return;
            }
            if (selection === "Download Hashicorp Vagrant") {
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse("https://developer.hashicorp.com/vagrant/docs/installation")
              );
              return;
            }
          });
      }

      progress.report({message: "Parallels Desktop: Checking for Git"});
      if (!config.tools.git.isInstalled) {
        const options: string[] = [];
        if (config.tools.brew.isInstalled) {
          options.push("Install Git");
        }
        options.push("Download Git");
        vscode.window
          .showErrorMessage(
            "Git is not installed, please install git to be able to create Packer Virtual Machines.",
            "Open Git Website",
            ...options
          )
          .then(selection => {
            if (selection === "Open Vagrant Website") {
              vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://www.vagrantup.com/"));
              return;
            }
            if (selection === "Install Git") {
              GitService.install().then(isGitInstalled => {
                if (!isGitInstalled) {
                  return;
                }
                // Cloning Packer example repo, need to wait to allow background process to finish
                GitService.cloneOrUpdatePackerExamples();
              });
              return;
            }
            if (selection === "Download Git") {
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse("https://git-scm.com/book/en/v2/Getting-Started-Installing-Git")
              );
              return;
            }
          });
      }

      progress.report({message: "Parallels Desktop: Updating Packer Recipes"});
      if (config.tools.git.isInstalled) {
        // Cloning Packer example repo, need to wait to allow background process to finish
        GitService.cloneOrUpdatePackerExamples().then(() => {
          // Caching Packer Addons
          if (config.tools.packer.isInstalled && config.tools.git.isInstalled && config.packerTemplatesCloned) {
            const platforms = ["windows", "ubuntu", "macos"];
            platforms.forEach(platform => {
              const addons = PackerService.getPlatformAddons(platform);
              Provider.getCache().set(`${Constants.CacheFlagPackerAddons}.${platform}`, addons);
            });
          }
        });
      }

      progress.report({message: "Parallels Desktop: Reading Feature Flags"});
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
        const options = ["Yes", "No"];
        vscode.window
          .showErrorMessage(
            "Help us improve the Parallels Desktop extension by allowing anonymous usage data to be sent to Parallels.\nFind more on https://www.alludo.com/legal/privacy",
            ...options
          )
          .then(selection => {
            if (selection === "Yes") {
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

      progress.report({message: "Finished"});
    }
  );
}
