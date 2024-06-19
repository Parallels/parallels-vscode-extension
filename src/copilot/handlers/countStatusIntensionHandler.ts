import * as vscode from "vscode";
import {ParallelsDesktopService} from "../../services/parallelsDesktopService";
import {CopilotOperation} from "../models";

export async function countStatusIntensionHandler(
  operation: string,
  stream: vscode.ChatResponseStream,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken
): Promise<CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: "",
      state: "failed"
    };

    try {
      stream.progress(`Checking ${operation.toLowerCase()} virtual machines...`);
      const vms = await ParallelsDesktopService.getVms();
      switch (operation.toUpperCase()) {
        case "RUNNING": {
          const runningVms = vms.filter(vm => vm.State === "running");
          if (runningVms.length === 0) {
            response.operation = `There are no machines running`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${runningVms.length > 1 ? "are" : "is"} ${
            runningVms.length
          } machines running:\n - ${runningVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          resolve(response);
          break;
        }
        case "STOPPED": {
          const stoppedVms = vms.filter(vm => vm.State === "stopped");
          if (stoppedVms.length === 0) {
            response.operation = `There are no machines stopped`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${stoppedVms.length > 1 ? "are" : "is"} ${
            stoppedVms.length
          } machines stopped:\n - ${stoppedVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          resolve(response);
          break;
        }
        case "PAUSED": {
          const pausedVms = vms.filter(vm => vm.State === "paused");
          if (pausedVms.length === 0) {
            response.operation = `There are no machines paused`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${pausedVms.length > 1 ? "are" : "is"} ${
            pausedVms.length
          } machines paused:\n - ${pausedVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          resolve(response);
          break;
        }
        case "SUSPENDED": {
          const suspendedVms = vms.filter(vm => vm.State === "suspended");
          if (suspendedVms.length === 0) {
            response.operation = `There are no machines suspended`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${suspendedVms.length > 1 ? "are" : "is"} ${
            suspendedVms.length
          } machines suspended:\n - ${suspendedVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          resolve(response);
          break;
        }
        default:
          response.operation = `The state ${operation} is not valid`;
          response.state = "failed";
          resolve(response);
          break;
      }
      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the virtual machines status`;
      response.state = "failed";
      resolve(response);
    }
  });
}
