import * as vscode from "vscode";
import {CopilotOperation} from "../models";
import {Provider} from "../../ioc/provider";
import {DevOpsCatalogHostProvider} from "../../models/devops/catalogHostProvider";
import {DevOpsRemoteHostProvider} from "../../models/devops/remoteHostProvider";

export async function remoteHostCountIntensionHandler(
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

      stream.progress(`Listing ${filter} remote host providers...`);
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
              provider => provider.state === "active" && provider.type === "remote_host"
            )
          );
          break;
        }
        case "INACTIVE": {
          catalogProviders.push(
            ...config.remoteHostProviders.filter(
              provider => provider.state === "inactive" && provider.type === "remote_host"
            )
          );
          break;
        }
      }
      if (catalogProviders.length === 0) {
        response.operation = `No remote host providers found for the filter ${filter}`;
        response.state = "failed";
        resolve(response);
        return;
      }
      response.operation = `There ${catalogProviders.length > 1 ? "are" : "is"} ${
        catalogProviders.length
      } ${filter} remote host providers:\n - ${catalogProviders.map(vm => vm.name).join("\n - ")}`;
      response.state = "success";

      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the ${filter} remote host providers`;
      response.state = "failed";
      resolve(response);
    }
  });
}
