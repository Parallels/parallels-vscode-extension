import * as vscode from "vscode";
import {CopilotUserIntension} from "../models";
import {extractJsonFromMarkdownCodeBlock, getChatHistory, processChatResponse} from "../helpers";
import {renderPrompt} from "@vscode/prompt-tsx";
import {LogIntensionPrompt} from "./debug";
import {VmInfoIntensionPrompt} from "./prompts/vmInfoIntensionPrompt";

export async function processVmInfoIntensions(
  userPrompt: string,
  vmInfo: string,
  context: vscode.ChatContext,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken
): Promise<CopilotUserIntension[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const {messages} = await renderPrompt(
        VmInfoIntensionPrompt,
        {VmInfoObject: vmInfo, userQuery: userPrompt, history: getChatHistory(context.history)},
        {modelMaxPromptTokens: model.maxInputTokens},
        model
      );

      const intensionMsgResponse = await model.sendRequest(messages, {}, token);
      const data = await processChatResponse(intensionMsgResponse);

      // extracting the json from the markdown code block
      const rawJsonBlock = extractJsonFromMarkdownCodeBlock(data);
      if (rawJsonBlock === "{}") {
        const response: CopilotUserIntension[] = [];
        const chatRequest: CopilotUserIntension = {
          intension: "CHAT_OUTPUT",
          operation: data,
          operation_value: "",
          target: "",
          VM: "",
          intension_description: data
        };
        response.push(chatRequest);
        resolve(response);
      }

      LogIntensionPrompt(messages, data, rawJsonBlock);
      const jsonBlock: CopilotUserIntension[] = JSON.parse(rawJsonBlock);
      if (!Array.isArray(jsonBlock)) {
        console.log(`Returning an array for the object: ${jsonBlock}`);
        resolve([jsonBlock]);
      }
      resolve(jsonBlock);
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}
