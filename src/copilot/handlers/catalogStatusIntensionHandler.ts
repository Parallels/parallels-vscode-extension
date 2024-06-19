import * as vscode from "vscode";
import {CopilotOperation} from "../models";
import {processPredictiveValueIntension} from "../training/processPredictiveValueIntension";
import {Provider} from "../../ioc/provider";

export async function catalogStatusIntensionHandler(
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
      stream.progress(`Checking the status of the catalog provider ${providerName}...`);
      const config = Provider.getConfiguration();
      const provider = config.catalogProviders.find(
        provider => provider.name.toLowerCase() === providerName.toLowerCase()
      );
      if (!provider) {
        const approximateProviderName = await processPredictiveValueIntension(
          providerName,
          config.catalogProviders.map(provider => provider.name),
          context,
          model,
          token
        );
        const provider = config.catalogProviders.find(
          provider => provider.name.toLowerCase() === approximateProviderName.toLowerCase()
        );
        if (!provider) {
          response.operation = `The catalog provider ${providerName} was not found`;
          response.state = "failed";
          resolve(response);
          return;
        }
      }

      response.operation = `The catalog provider ${provider?.name} is ${provider?.state}`;
      response.state = "success";
      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the catalog provider status`;
      response.state = "failed";
      resolve(response);
    }
  });
}
