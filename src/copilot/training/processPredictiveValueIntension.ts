import * as vscode from "vscode";

import {processChatResponse} from "../helpers";
import {renderPrompt} from "@vscode/prompt-tsx";
import {PredictiveIntensionPrompt} from "./prompts/predictiveIntensionPrompt";
import {LogIntensionPrompt} from "./debug";

export async function processPredictiveValueIntension(
  userPrompt: string,
  valuesToDeductFrom: string[],
  context: vscode.ChatContext,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const {messages} = await renderPrompt(
        PredictiveIntensionPrompt,
        {userQuery: userPrompt, values: valuesToDeductFrom},
        {modelMaxPromptTokens: model.maxInputTokens},
        model
      );

      const intensionMsgResponse = await model.sendRequest(messages, {}, token);
      const data = await processChatResponse(intensionMsgResponse);
      LogIntensionPrompt(messages, data);
      const response = data
        .replace(/`/g, "")
        .replace(/{/g, "")
        .replace(/}/g, "")
        .replace(/```/g, "")
        .replace(/\n/g, "")
        .trim();
      resolve(response);
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}
