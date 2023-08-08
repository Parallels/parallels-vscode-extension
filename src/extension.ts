import * as vscode from "vscode";
import {VirtualMachineProvider} from "./tree/virtual_machine";
import {Provider} from "./ioc/provider";
import {ParallelsDesktopService} from "./services/parallelsDesktopService";
import {initialize} from "./initialization";
import {registerClearDownloadCacheCommand} from "./commands/clearDownloads";
import {VagrantBoxProvider} from "./tree/vagrant_boxes";
import {CommandsFlags, TelemetryEventIds} from "./constants/flags";
import {parallelsOutputChannel} from "./helpers/channel";
import { LogService } from "./services/logService";

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

  if (Provider.getConfiguration().allMachines.length > 0) {
    vscode.commands.executeCommand("setContext", "parallels-desktop:hasVirtualMachines", true);
  } else {
    vscode.commands.executeCommand("setContext", "parallels-desktop:hasVirtualMachines", false);
  }

  // Setting the auto refresh mechanism
  const settings = Provider.getSettings();
  const config = Provider.getConfiguration();
  const autoRefresh = settings.get<boolean>("autoRefresh");
  if (autoRefresh) {
    parallelsOutputChannel.appendLine("Auto refresh is enabled");
    let interval = settings.get<number>("refreshInterval");
    if (interval === undefined) {
      parallelsOutputChannel.appendLine("Auto refresh interval is not defined, setting default to 60 seconds");
      interval = 60000;
    }
    if (interval < 10000) {
      parallelsOutputChannel.appendLine("Auto refresh interval is too low, setting minimum to 10 seconds");
      interval = 10000;
    }

    parallelsOutputChannel.appendLine("Auto refresh interval is " + interval);
    setInterval(() => {
      parallelsOutputChannel.appendLine("Refreshing the virtual machine tree view");
      vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
      parallelsOutputChannel.appendLine("Refreshing the vagrant box tree view");
      vscode.commands.executeCommand(CommandsFlags.vagrantBoxProviderRefresh);
    }, interval);
  }

  const list = await ParallelsDesktopService.getVms();
  registerClearDownloadCacheCommand(context);

  if (config.isDebugEnabled) {
    LogService.info("Debug mode is enabled", "CoreService");
  }
  vscode.commands.executeCommand("setContext", "parallels-desktop:initialized", true);
  LogService.sendTelemetryEvent(TelemetryEventIds.ExtensionStarted)
  console.log("Parallels Desktop Extension is now active!");
}


// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Deactivating Parallels Desktop Extension");
  //TODO: remove all the commands
}
