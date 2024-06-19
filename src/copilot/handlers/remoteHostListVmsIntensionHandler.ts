import * as vscode from "vscode";
import {CopilotOperation} from "../models";
import {processPredictiveValueIntension} from "../training/processPredictiveValueIntension";
import {Provider} from "../../ioc/provider";

export async function remoteHostListIntensionHandler(
  providerName: string,
  filter: string,
  context: vscode.ChatContext,
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
      if (!filter) {
        filter = "all";
      }
      if (filter === "available" || filter === "healthy") {
        filter = "active";
      }
      if (filter === "unavailable" || filter === "unhealthy") {
        filter = "inactive";
      }

      stream.progress(`Listing ${filter} virtual machines on the remote host provider ${providerName}...`);
      const config = Provider.getConfiguration();
      const provider = config.remoteHostProviders.find(
        provider => provider.name.toLowerCase() === providerName.toLowerCase() && provider.type === "remote_host"
      );
      if (!provider) {
        const approximateProviderName = await processPredictiveValueIntension(
          providerName,
          config.remoteHostProviders.filter(provider => provider.type === "remote_host").map(provider => provider.name),
          context,
          model,
          token
        );
        const provider = config.remoteHostProviders.find(
          provider => provider.name.toLowerCase() === approximateProviderName.toLowerCase()
        );
        if (!provider) {
          response.operation = `The remote host provider ${providerName} was not found`;
          response.state = "failed";
          resolve(response);
          return;
        }
      }

      const vms = provider?.virtualMachines ?? [];
      if (vms.length === 0) {
        response.operation = `No virtual machines found in ${provider?.name}`;
        response.state = "failed";
        resolve(response);
        return;
      }
      switch (filter.toUpperCase()) {
        case "ALL": {
          response.operation = `There ${vms.length > 1 ? "are" : "is"} ${vms.length} ${
            vms.length > 1 ? "virtual machines" : "virtual machine"
          } in ${provider?.name} remote host:\n - ${vms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          break;
        }
        case "RUNNING": {
          const activeVms = vms.filter(vm => vm.State === "running");
          if (activeVms.length === 0) {
            response.operation = `There is no running virtual machines found in ${provider?.name} remote host`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${activeVms.length > 1 ? "are" : "is"} ${activeVms.length} running ${
            activeVms.length > 1 ? "virtual machines" : "virtual machine"
          } in ${provider?.name} remote host:\n - ${activeVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          break;
        }
        case "STOPPED": {
          const inactiveVms = vms.filter(vm => vm.State === "stopped");
          if (inactiveVms.length === 0) {
            response.operation = `There is no stopped virtual machines found in ${provider?.name} remote host`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${inactiveVms.length > 1 ? "are" : "is"} ${inactiveVms.length} stopped ${
            inactiveVms.length > 1 ? "virtual machines" : "virtual machine"
          } in ${provider?.name} remote host:\n - ${inactiveVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          break;
        }
        case "SUSPENDED": {
          const inactiveVms = vms.filter(vm => vm.State === "suspended");
          if (inactiveVms.length === 0) {
            response.operation = `There is no stopped virtual machines found in ${provider?.name} remote host`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${inactiveVms.length > 1 ? "are" : "is"} ${inactiveVms.length} suspended ${
            inactiveVms.length > 1 ? "virtual machines" : "virtual machine"
          } in ${provider?.name} remote host:\n - ${inactiveVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          break;
        }
        case "PAUSED": {
          const inactiveVms = vms.filter(vm => vm.State === "suspended");
          if (inactiveVms.length === 0) {
            response.operation = `There is no stopped virtual machines found in ${provider?.name} remote host`;
            response.state = "success";
            resolve(response);
            return;
          }
          response.operation = `There ${inactiveVms.length > 1 ? "are" : "is"} ${inactiveVms.length} suspended ${
            inactiveVms.length > 1 ? "virtual machines" : "virtual machine"
          } in ${provider?.name} remote host:\n - ${inactiveVms.map(vm => vm.Name).join("\n - ")}`;
          response.state = "success";
          break;
        }
        default: {
          response.operation = `Invalid filter ${filter} for ${providerName}`;
          response.state = "failed";
          break;
        }
      }

      if (response.operation) {
        resolve(response);
        return;
      }

      response.operation = `Was not able to process the ${providerName} operation on the remote host provider ${providerName} with the filter ${filter}`;
      response.state = "failed";
      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the manifests from the remote host provider ${providerName}`;
      response.state = "failed";
      resolve(response);
    }
  });
}
