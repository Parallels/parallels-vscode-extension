// import * as vscode from "vscode";

// import {parallelsOutputChannel} from "../../helpers/channel";
// import {Provider} from "../../ioc/provider";
// import {CommandsFlags, FLAG_NO_GROUP} from "../../constants/flags";
// import {VirtualMachineProvider} from "../virtual_machine";
// import {ParallelsDesktopService} from "../../services/ParallelsDesktopService";

// export function registerRemoveGroupCommand(context: vscode.ExtensionContext, provider: VirtualMachineProvider) {
//   context.subscriptions.push(
//     vscode.commands.registerCommand(CommandsFlags.treeViewRemoveGroup, async item => {
//       const group = Provider.getConfiguration().getVirtualMachineGroup(item.name);
//       const machineCount = group?.getAllMachines()?.length ?? 0;
//       const machinesNotDeleted: string[] = [];
//       if (group !== undefined) {
//         const options: string[] = ["Yes", "No"];
//         const confirmation = await vscode.window.showQuickPick(options, {
//           placeHolder: `Are you sure you want to remove group ${item.name}?`
//         });
//         if (confirmation === "Yes") {
//           if (machineCount > 0) {
//             const removeChildren = await vscode.window.showQuickPick(options, {
//               placeHolder: `Delete ${machineCount} virtual machines from group ${item.name} and its sub groups?`
//             });
//             const noGroup = Provider.getConfiguration().getVirtualMachineGroup(FLAG_NO_GROUP);

//             const allMachines = group.getAllMachines();
//             allMachines.forEach(async vm => {
//               if (removeChildren === "Yes") {
//                 if (vm.State === "stopped") {
//                   await ParallelsDesktopService.deleteVm(vm.ID);
//                 } else {
//                   machinesNotDeleted.push(vm.Name);
//                   noGroup?.add(vm);
//                 }
//               } else {
//                 noGroup?.add(vm);
//               }
//             });
//           }
//           Provider.getConfiguration().deleteVirtualMachineGroup(item.name);

//           if (machineCount > 0 && machinesNotDeleted.length > 0) {
//             vscode.window.showWarningMessage(
//               `The following virtual machines were not deleted: ${machinesNotDeleted.join(", ")}`
//             );
//           }

//           vscode.commands.executeCommand(CommandsFlags.treeViewRefreshVms);
//           parallelsOutputChannel.appendLine(`Group ${item.name} removed`);
//         }
//       }
//     })
//   );
// }
