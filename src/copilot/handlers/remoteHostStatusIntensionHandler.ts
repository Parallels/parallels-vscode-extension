import * as vscode from "vscode";
import {CopilotOperation} from "../models";
import {processPredictiveValueIntension} from "../training/processPredictiveValueIntension";
import {Provider} from "../../ioc/provider";

export async function remoteHostStatusIntensionHandler(
  providerName: string,
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
      stream.progress(`Checking the status of the remote host provider ${providerName}...`);
      const config = Provider.getConfiguration();
      let provider = config.remoteHostProviders.find(
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
        provider = config.remoteHostProviders.find(
          provider => provider.name.toLowerCase() === approximateProviderName.toLowerCase()
        );
        if (!provider) {
          response.operation = `The remote host provider ${providerName} was not found`;
          response.state = "failed";
          resolve(response);
          return;
        }
      }

      response.operation = `The remote host provider ${provider?.name} is ${provider?.state}`;
      response.state = "success";
      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the remote host provider status`;
      response.state = "failed";
      resolve(response);
    }
  });
}
