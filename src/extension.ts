import {ParallelsVirtualMachine} from "./models/virtual_machine";
import * as vscode from "vscode";
import * as cp from "child_process";
import {VirtualMachineProvider} from "./tree/virtual_machine";
import {Commands} from "./helpers/commands";
import {addVirtualMachineInput} from "./quickpicker/add_machine";
import {VagrantService} from "./hashicorp/vagrant";
import {PackerService} from "./hashicorp/packer";
import {registerTestCommand} from "./commands/test";
import {LocalStorageService} from "./services/localStorage";
import {FLAG_CONFIGURATION, FLAG_PACKER_VERSION, FLAG_VAGRANT_VERSION} from "./constants/flags";
import {CacheService} from "./services/memoryCache";
import {ConfigurationService as Configuration} from "./services/configurationService";
import {Provider, localStorage} from "./ioc/provider";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {initialize} from "./initialization";

export async function activate(context: vscode.ExtensionContext) {
  const provider = new Provider(context);

  // Registering our URI
  const myScheme = "parallels";
  const myProvider = new (class implements vscode.TextDocumentContentProvider {
    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
      // simply invoke cowsay, use uri-path as text
      return `test`;
    }
  })();

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));

  // Initializing the extension
  await initialize();

  const virtualMachineProvider = new VirtualMachineProvider(context);
  // vscode.window.registerTreeDataProvider("parallels-desktop", virtualMachineProvider);
  vscode.commands.executeCommand("setContext", "parallels-desktop:hasVirtualMachines", true);

  console.log('Congratulations, your extension "parallels-desktop" is now active!');

  const vagrant = new VagrantService(context);
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
    interval === undefined ? 60000 : interval
  );

  vscode.commands.executeCommand("setContext", "parallels-desktop:initialized", true);
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Deactivating Parallels Desktop Extension");
  //TODO: remove all the commands
  let version = localStorage.get(FLAG_VAGRANT_VERSION);
  localStorage.delete(FLAG_VAGRANT_VERSION);
  version = localStorage.get(FLAG_VAGRANT_VERSION);
  console.log(`Vagrant version: ${version}`);
}
