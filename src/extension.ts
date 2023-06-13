import * as vscode from "vscode";
import {VirtualMachineProvider} from "./tree/virtual_machine";
import {VagrantService} from "./services/vagrantService";
import {Provider} from "./ioc/provider";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {initialize} from "./initialization";
import {registerClearDownloadCacheCommand} from "./commands/clearDownloads";
import {VagrantBoxProvider} from "./tree/vagrant_boxes";

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

  // Registering the  Virtual Machine Provider
  const virtualMachineProvider = new VirtualMachineProvider(context);
  const vagrantBoxProvider = new VagrantBoxProvider(context);

  if (Provider.getConfiguration().countMachines() > 0) {
    vscode.commands.executeCommand("setContext", "parallels-desktop:hasVirtualMachines", true);
  }

  // TODO: Implement an auto refresh that is not as aggressive as the one below
  // Setting the auto refresh mechanism
  // const config = Provider.getSettings();
  // const autoRefresh = config.get<boolean>("autoRefresh");
  // if (autoRefresh) {
  //   const interval = config.get<number>("refreshInterval");
  //   setInterval(
  //     () => {
  //       virtualMachineProvider.refresh();
  //     },
  //     interval === undefined ? 30000 : interval
  //   );
  // }

  const list = await ParallelsDesktopService.getVms();
  list.forEach(vm => {
    console.log(vm.OS);
  });
  registerClearDownloadCacheCommand(context);

  vscode.commands.executeCommand("setContext", "parallels-desktop:initialized", true);
  console.log("Parallels Desktop Extension is now active!");
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Deactivating Parallels Desktop Extension");
  //TODO: remove all the commands
}
