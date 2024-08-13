import * as vscode from "vscode";
import {CopilotOperation} from "../models";
import {Provider} from "../../ioc/provider";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";

export async function orchestratorCountIntensionHandler(
  filter: string,
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

      stream.progress(`Listing ${filter} orchestrator providers...`);
      const config = Provider.getConfiguration();
      const catalogProviders: DevOpsRemoteHostProvider[] = [];
      switch (filter.toUpperCase()) {
        case "ALL": {
          catalogProviders.push(...config.remoteHostProviders);
          break;
        }
        case "ACTIVE": {
          catalogProviders.push(
            ...config.remoteHostProviders.filter(
              provider => provider.state === "active" && provider.type === "orchestrator"
            )
          );
          break;
        }
        case "INACTIVE": {
          catalogProviders.push(
            ...config.remoteHostProviders.filter(
              provider => provider.state === "inactive" && provider.type === "orchestrator"
            )
          );
          break;
        }
      }
      if (catalogProviders.length === 0) {
        response.operation = `No orchestrator providers found for the filter ${filter}`;
        response.state = "failed";
        resolve(response);
        return;
      }
      response.operation = `There ${catalogProviders.length > 1 ? "are" : "is"} ${
        catalogProviders.length
      } ${filter} orchestrator providers:\n - ${catalogProviders.map(vm => vm.name).join("\n - ")}`;
      response.state = "success";

      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the ${filter} orchestrator providers`;
      response.state = "failed";
      resolve(response);
    }
  });
}
