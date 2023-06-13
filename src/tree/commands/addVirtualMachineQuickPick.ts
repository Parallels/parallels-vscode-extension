// import * as vscode from "vscode";

// import {parallelsOutputChannel} from "../../helpers/channel";
// import {Provider} from "../../ioc/provider";
// import {VirtualMachineGroup} from "../../models/virtualMachineGroup";
// import {VirtualMachineProvider} from "../virtual_machine";
// import {CommandsFlags} from "../../constants/flags";
// import {addVirtualMachineInput} from "../../quickpicker/add_machine.ts.bck";

// export function registerAddVirtualMachineQuickPickCommand(
//   context: vscode.ExtensionContext,
//   provider: VirtualMachineProvider
// ) {
//   context.subscriptions.push(
//     vscode.commands.registerCommand(CommandsFlags.treeViewAddVm, async () => {
//       const quickPick = vscode.window.createQuickPick();
//       quickPick.items = [
//         {label: "Linux", description: "Creates a Linux based Virtual Machine"},
//         {label: "Windows", description: "Creates a Windows based Virtual Machine"}
//       ];
//       quickPick.onDidChangeSelection(selection => {
//         switch (selection[0].label) {
//           case "Linux":
//             addVirtualMachineInput("linux", context).catch(console.error);
//             break;
//           case "Windows":
//             addVirtualMachineInput("windows", context).catch(console.error);
//             break;
//         }
//       });
//       quickPick.onDidHide(() => quickPick.dispose());
//       quickPick.show();
//     })
//   );
// }
