import * as vscode from "vscode";
import * as cp from "child_process";
import {VirtualMachineProvider} from "./tree/virtual_machine";
import {Commands} from "./helpers/commands";
import {addVirtualMachineInput} from "./quickpicker/add_machine";
import {Vagrant} from "./hashicorp/vagrant";
import {Packer} from "./hashicorp/packer";

export async function activate(context: vscode.ExtensionContext) {
  const isParallelsInstalled = await Commands.isParallelsDesktopInstalled();
  if (!isParallelsInstalled) {
    vscode.window
      .showErrorMessage(
        "Parallels Desktop is not installed, please install Parallels Desktop and try again.",
        "Open Parallels Desktop Website"
      )
      .then(selection => {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://www.parallels.com/products/desktop/"));
      });
    return;
  }

  let isPackerInstalled = await Packer.isInstalled();
  let isVagrantInstalled = await Vagrant.isInstalled();
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
          Packer.install().then(result => {
            if (result) {
              isPackerInstalled = true;
              vscode.window.showInformationMessage("Packer installed successfully");
            } else {
              vscode.window.showErrorMessage("Packer installation failed");
            }
          });
          Vagrant.install().then(result => {
            if (result) {
              isVagrantInstalled = true;
              vscode.window.showInformationMessage("Vagrant installed successfully");
            } else {
              vscode.window.showErrorMessage("Vagrant installation failed");
            }
          });
        } else {
          if (selection === "Install Packer") {
            Packer.install().then(result => {
              if (result) {
                isPackerInstalled = true;
                vscode.window.showInformationMessage("Packer installed successfully");
              } else {
                vscode.window.showErrorMessage("Packer installation failed");
              }
            });
          } else if (selection === "Install Vagrant") {
            Vagrant.install().then(result => {
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

  const virtualMachineProvider = new VirtualMachineProvider("");
  vscode.window.registerTreeDataProvider("parallels-desktop", virtualMachineProvider);

  console.log('Congratulations, your extension "parallels-desktop" is now active!');

  if (isPackerInstalled && isVagrantInstalled) {
    const addMachineCmd = vscode.commands.registerCommand("parallels-desktop.add-vm", async => {
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = [
        {label: "Linux", description: "Creates a Linux based Virtual Machine"},
        {label: "Windows", description: "Creates a Windows based Virtual Machine"}
      ];
      quickPick.onDidChangeSelection(selection => {
        switch (selection[0].label) {
          case "Linux":
            addVirtualMachineInput("linux", context).catch(console.error);
            break;
          case "Windows":
            addVirtualMachineInput("windows", context).catch(console.error);
            break;
        }
      });
      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    });
    context.subscriptions.push(addMachineCmd);
  }

  const startCmd = vscode.commands.registerCommand("parallels-desktop.start-vm", async vmId => {
    console.log(`starting vm: ${vmId.id}`);
    cp.exec(`prlctl start ${vmId.id}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
    });

    let retry = 40;
    while (true) {
      virtualMachineProvider.refresh();
      const result = await Commands.getMachineStatus(vmId.id);
      if (result === "running") {
        break;
      }
      if (retry === 0) {
        break;
      }
      retry--;
    }
  });

  const stopCmd = vscode.commands.registerCommand("parallels-desktop.stop-vm", async vmId => {
    console.log(`stopping vm: ${vmId.id}`);
    cp.exec(`prlctl stop ${vmId.id}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
    });

    let retry = 40;
    while (true) {
      virtualMachineProvider.refresh();
      const result = await Commands.getMachineStatus(vmId.id);
      if (result === "stopped") {
        break;
      }
      if (retry === 0) {
        break;
      }
      retry--;
    }
  });

  const resumeCmd = vscode.commands.registerCommand("parallels-desktop.resume-vm", async vmId => {
    console.log(`resuming vm: ${vmId.id}`);
    cp.exec(`prlctl resume ${vmId.id}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
    });

    let retry = 40;
    while (true) {
      virtualMachineProvider.refresh();
      const result = await Commands.getMachineStatus(vmId.id);
      if (result === "running") {
        break;
      }
      if (retry === 0) {
        break;
      }
      retry--;
    }
  });

  const pauseCmd = vscode.commands.registerCommand("parallels-desktop.pause-vm", async vmId => {
    console.log(`pausing vm: ${vmId.id}`);
    cp.exec(`prlctl pause ${vmId.id}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
    });
    let retry = 40;
    while (true) {
      virtualMachineProvider.refresh();
      const result = await Commands.getMachineStatus(vmId.id);
      if (result === "paused") {
        break;
      }
      if (retry === 0) {
        break;
      }
      retry--;
    }
  });

  const refreshCommand = vscode.commands.registerCommand("parallels-desktop.refresh", () => {
    console.log("refreshing");
    virtualMachineProvider.refresh();
  });

  const vagrant = new Vagrant(context);
  vagrant.getCurrentBoxes().then(boxes => {
    boxes.forEach(box => {
      console.log(box);
    });
  });

  const config = vscode.workspace.getConfiguration("parallels-desktop");
  const interval = config.get<number>("refreshInterval");
  setInterval(
    () => {
      virtualMachineProvider.refresh();
    },
    interval === undefined ? 1000 : interval
  );

  context.subscriptions.push(startCmd);
  context.subscriptions.push(stopCmd);
  context.subscriptions.push(resumeCmd);
  context.subscriptions.push(pauseCmd);
  context.subscriptions.push(refreshCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {
  //TODO: remove all the commands
}
