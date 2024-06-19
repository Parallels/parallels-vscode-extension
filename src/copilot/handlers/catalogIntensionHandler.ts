import {CopilotUserIntension} from "./../models";
import * as vscode from "vscode";
import {CopilotOperation} from "../models";
import {catalogStatusIntensionHandler} from "./catalogStatusIntensionHandler";
import {catalogListIntensionHandler} from "./catalogListIntensionHandler";
import {catalogCountIntensionHandler} from "./catalogCountIntensionHandler";
import {processCatalogProviderIntensions} from "../training/processCatalogProviderIntensions";

export async function catalogIntensionHandler(
  intension: CopilotUserIntension,
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
      const userIntension = intension.intension_description ?? intension.intension;
      const catalogProviderIntensions = await processCatalogProviderIntensions(userIntension, context, model, token);
      for (const key in catalogProviderIntensions) {
        switch (catalogProviderIntensions[key].operation.toUpperCase()) {
          case "COUNT": {
            const statusResponse = await catalogCountIntensionHandler(
              catalogProviderIntensions[key].operation_value,
              stream,
              model,
              token
            );
            resolve(statusResponse);
            break;
          }
          case "LIST": {
            const statusResponse = await catalogCountIntensionHandler(
              catalogProviderIntensions[key].operation_value,
              stream,
              model,
              token
            );
            resolve(statusResponse);
            break;
          }
          case "LIST_MANIFESTS": {
            const statusResponse = await catalogListIntensionHandler(
              catalogProviderIntensions[key].target,
              catalogProviderIntensions[key].operation_value,
              context,
              stream,
              model,
              token
            );
            resolve(statusResponse);
            break;
          }
          case "STATUS": {
            if (catalogProviderIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = "failed";
              resolve(response);
              return;
            }

            const statusResponse = await catalogStatusIntensionHandler(
              catalogProviderIntensions[key].target,
              context,
              stream,
              model,
              token
            );
            resolve(statusResponse);
            break;
          }
          default: {
            response.operation = `The command ${catalogProviderIntensions[key].intension} is not supported`;
            response.state = "failed";
            resolve(response);
            break;
          }
        }
      }
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the intension ${intension.intension} for the catalog provider ${intension.target}`;
      response.state = "failed";
      resolve(response);
    }
  });
}
