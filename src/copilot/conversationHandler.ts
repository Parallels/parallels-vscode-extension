import * as vscode from "vscode";
import {GPT_3_TURBO_MODEL_SELECTOR, GPT_4_MODEL_SELECTOR} from "./constants";
import {CommandsFlags} from "../constants/flags";
import {processUserIntensions} from "./training/processUserIntensions";
import {CopilotOperation, ICatChatResult} from "./models";
import {processChatAgentResponse} from "./training/processChatAgentResponse";
import {createIntensionHandler} from "./handlers/createIntensionHandler";
import {statusIntensionHandler} from "./handlers/statusIntensionHandler";
import {countStatusIntensionHandler} from "./handlers/countStatusIntensionHandler";
import {setIntensionHandler} from "./handlers/setIntensionHandler";
import {chatIntensionHandler} from "./handlers/chatIntensionHandler";
import {getChatHistory} from "./helpers";
import {catalogIntensionHandler} from "./handlers/catalogIntensionHandler";
import {orchestratorIntensionHandler} from "./handlers/orchestartorIntensionHandler";
import {remoteHostIntensionHandler} from "./handlers/remoteHostIntensionHandler";
import {vmInfoIntensionHandler} from "./handlers/vmInfoIntensionHandler";
import {Provider} from "../ioc/provider";

// Define the parallels desktop conversation handler.
export const conversationHandler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<ICatChatResult> => {
  const telemetry = Provider.telemetry();
  if (request.command == "create") {
    stream.progress("Picking the right topic to teach...");
    const topic = getChatHistory(context.history);
    const messages = [
      vscode.LanguageModelChatMessage.User(`
          knowing this:
          If I need to create a virtual machine I will need to generate a json object like this
          {
              "name": "ged",
              "architecture": "arm64",
              "startOnCreate": false,
              "catalog_manifest": {
                  "catalog_id": "name",
                  "version": "latest",
                  "connection": "host=root:Nmo5c2U1YTZycWc0Ojc4YmZkOWNlZjJmMjU0Z000@https://devops.local-build.co"
              }
          }
          and that the necessary information in order to achieve that will be:
          - the name of the machine
          - the architecture
          - the catalog manifest catalog id 
          - the catalog manifest version
          - the catalog manifest connection also known as catalog
          Generate me only the json part in the right format, but if any of the required information is missing please ask.
          `),
      vscode.LanguageModelChatMessage.User(topic)
    ];
    const [model] = await vscode.lm.selectChatModels(GPT_3_TURBO_MODEL_SELECTOR);
    const chatResponse = await model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }

    stream.button({
      command: CommandsFlags.devopsAddCatalogProvider,
      title: vscode.l10n.t("Test")
    });

    return {metadata: {command: "create"}};
  } else if (request.command == "status") {
    stream.progress("Throwing away the computer science books and preparing to play with some Python code...");
    const messages = [
      vscode.LanguageModelChatMessage.User(
        "You are a cat! Reply in the voice of a cat, using cat analogies when appropriate. Be concise to prepare for cat play time."
      ),
      vscode.LanguageModelChatMessage.User(
        "Give a small random python code samples (that have cat names for variables). " + request.prompt
      )
    ];
    const [model] = await vscode.lm.selectChatModels(GPT_3_TURBO_MODEL_SELECTOR);
    const chatResponse = await model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
    return {metadata: {command: "status"}};
  } else {
    const models = await vscode.lm.selectChatModels(GPT_4_MODEL_SELECTOR);
    if (models.length === 0) {
      stream.markdown("There was an error getting the models, please reach out to the extension developer.");
      return {metadata: {command: ""}};
    }
    const model = models[0];
    const intensions = await processUserIntensions(request.prompt, context, model, token);
    const intensionOperations: CopilotOperation[] = [];
    for (let i = 0; i < intensions.length; i++) {
      if (!intensions[i].intension) {
        stream.markdown(`I am not sure what you are asking me to do, please try again with a more defined input.`);
        return {metadata: {command: ""}};
      }

      telemetry.sendCopilotEvent(intensions[i].intension, intensions[i].operation, intensions[i].intension_description);
      console.log(intensions[i]);
      const userIntension = intensions[i].intension_description ? intensions[i].intension_description : request.prompt;
      switch (intensions[i].intension.toUpperCase()) {
        case "CREATE": {
          const response = await createIntensionHandler(userIntension, context, stream, model, token);
          if (i < intensions.length - 1) {
            stream.progress(response.operation);
            intensionOperations.push(response);
          } else {
            intensionOperations.push(response);
          }
          break;
        }
        case "CHAT": {
          const response = await chatIntensionHandler(userIntension, context, model, token);
          stream.markdown(response.operation);
          break;
        }
        case "CHAT_OUTPUT": {
          stream.markdown(intensions[i].intension_description);
          return {metadata: {command: ""}};
        }
        case "STATUS": {
          if (
            !intensions[i].operation &&
            !intensions[i].VM &&
            !intensions[i].operation_value &&
            !intensions[i].target
          ) {
            stream.markdown(`I am not sure what you are asking me to do, please try again with a more defined input.`);
            return {metadata: {command: ""}};
          }

          let vmName = intensions[i].VM ? intensions[i].VM : intensions[i].operation_value;
          if (!vmName && intensions[i].target) {
            vmName = intensions[i].target;
          }
          if (!vmName) {
            stream.markdown(`I am not sure what you are asking me to do, please try again with a more defined input.`);
            return {metadata: {command: ""}};
          }

          const response = await statusIntensionHandler(vmName, context, stream, model, token);
          if (i < intensions.length - 1) {
            stream.progress(response.operation);
            intensionOperations.push(response);
          } else {
            stream.markdown(response.operation);
            return {metadata: {command: ""}};
          }
          break;
        }
        case "COUNT_STATUS": {
          if (!intensions[i].operation) {
            stream.markdown(`I am not sure what you are asking me to do, please try again with a more defined input.`);
            return {metadata: {command: ""}};
          }

          if (intensions[i].operation.toUpperCase() === "ALL") {
            const running = await countStatusIntensionHandler("RUNNING", stream, model, token);
            const stopped = await countStatusIntensionHandler("STOPPED", stream, model, token);
            const paused = await countStatusIntensionHandler("PAUSED", stream, model, token);
            const suspended = await countStatusIntensionHandler("SUSPENDED", stream, model, token);
            intensionOperations.push(stopped);
            intensionOperations.push(paused);
            intensionOperations.push(suspended);
            intensionOperations.push(running);
            break;
          } else {
            const response = await countStatusIntensionHandler(
              intensions[i].operation.toUpperCase(),
              stream,
              model,
              token
            );
            intensionOperations.push(response);
          }
          break;
        }
        case "SET": {
          if (!intensions[i].operation) {
            stream.markdown(`I am not sure what you are asking me to do, please try again with a more defined input.`);
            return {metadata: {command: ""}};
          }

          let vmName = intensions[i].VM ? intensions[i].VM : intensions[i].operation_value;
          if (!vmName && intensions[i].target) {
            vmName = intensions[i].target;
          }
          if (!vmName) {
            stream.markdown(`I am not sure what you are asking me to do, please try again with a more defined input.`);
            return {metadata: {command: ""}};
          }
          const responses = await setIntensionHandler(
            intensions[i].operation.toUpperCase(),
            vmName,
            context,
            stream,
            model,
            token
          );
          for (const response of responses) {
            intensionOperations.push(response);
          }
          break;
        }
        case "CATALOG_PROVIDER": {
          const response = await catalogIntensionHandler(intensions[i], context, stream, model, token);
          intensionOperations.push(response);
          break;
        }
        case "ORCHESTRATOR_PROVIDER": {
          const response = await orchestratorIntensionHandler(intensions[i], context, stream, model, token);
          intensionOperations.push(response);
          break;
        }
        case "REMOTE_HOST_PROVIDER": {
          const response = await remoteHostIntensionHandler(intensions[i], context, stream, model, token);
          intensionOperations.push(response);
          break;
        }
        case "VM_INFO": {
          const response = await vmInfoIntensionHandler(intensions[i], context, stream, model, token);
          if (i < intensions.length - 1) {
            stream.progress(response.operation);
            intensionOperations.push(response);
          } else {
            intensionOperations.push(response);
          }
          break;
        }
      }
    }

    if (intensionOperations.length === 0) {
      stream.markdown("I am not sure what you are asking me to do, please try again with a more defined input.");
      return {metadata: {command: ""}};
    } else if (intensionOperations.length === 1) {
      stream.markdown(intensionOperations[0].operation);
      return {metadata: {command: ""}};
    } else {
      const response = await processChatAgentResponse(intensionOperations, context, model, token);

      stream.markdown(response);

      return {metadata: {command: ""}};
    }
  }
};
