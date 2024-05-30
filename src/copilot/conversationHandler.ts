import * as vscode from 'vscode';
import { MODEL_SELECTOR } from './constants';
import { CommandsFlags } from '../constants/flags';
import { processUserIntensions } from './training/intensions';
import { CopilotOperation, ICatChatResult } from './models';
import { processCopilotOperationResponse } from './training/copilotResponse';
import { createIntensionHandler } from './handlers/createIntensionHandler';
import { statusIntensionHandler } from './handlers/statusIntensionHandler';
import { countStatusIntensionHandler } from './handlers/countStatusIntensionHandler';
import { setIntensionHandler } from './handlers/setIntensionHandler';
import { chatIntensionHandler } from './handlers/chatIntensionHandler';
import { getChatHistory } from './helpers';

// Define the parallels desktop conversation handler.
export const conversationHandler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<ICatChatResult> => {
  if (request.command == 'create') {
    stream.progress('Picking the right topic to teach...');
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
    const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
    const chatResponse = await model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }

    stream.button({
      command: CommandsFlags.devopsAddCatalogProvider,
      title: vscode.l10n.t('Test')
    });

    return { metadata: { command: 'create' } };
  } else if (request.command == 'status') {
    stream.progress('Throwing away the computer science books and preparing to play with some Python code...');
    const messages = [
      vscode.LanguageModelChatMessage.User('You are a cat! Reply in the voice of a cat, using cat analogies when appropriate. Be concise to prepare for cat play time.'),
      vscode.LanguageModelChatMessage.User('Give a small random python code samples (that have cat names for variables). ' + request.prompt)
    ];
    const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
    const chatResponse = await model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
    return { metadata: { command: 'status' } };
  } else {
    const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
    const intensions = await processUserIntensions(request.prompt, context, model, token);
    const intensionOperations: CopilotOperation[] = [];
    for (let i = 0; i < intensions.length; i++) {
      console.log(intensions[i])
      const userIntension = intensions[i].intension_description ? intensions[i].intension_description : request.prompt;
      switch (intensions[i].intension.toUpperCase()) {
        case 'CREATE': {
          const response = await createIntensionHandler(userIntension, stream, model, token);
          if (i < intensions.length - 1) {
            stream.progress(response.operation);
            intensionOperations.push(response);
          } else {
            intensionOperations.push(response);
          }
          break;
        }
        case 'CHAT': {
          const response = await chatIntensionHandler(userIntension, stream, model, token);
          stream.markdown(response.operation);
          break;
        }
        case 'STATUS': {
          const vmName = intensions[i].VM ? intensions[i].VM : intensions[i].operation_value;
          const response = await statusIntensionHandler(vmName, stream, model, token);
          if (i < intensions.length - 1) {
            stream.progress(response.operation);
            intensionOperations.push(response);
          } else {
            stream.markdown(response.operation);
            return { metadata: { command: '' } };
          }
          break;
        }
        case 'COUNT_STATUS': {
          if (intensions[i].operation === 'all') {
            const running = await countStatusIntensionHandler('RUNNING', stream, model, token);
            const stopped = await countStatusIntensionHandler('STOPPED', stream, model, token);
            const paused = await countStatusIntensionHandler('PAUSED', stream, model, token);
            const suspended = await countStatusIntensionHandler('SUSPENDED', stream, model, token);
            intensionOperations.push(stopped);
            intensionOperations.push(paused);
            intensionOperations.push(suspended);
            intensionOperations.push(running);
            break;
          } else {
            const response = await countStatusIntensionHandler(intensions[i].operation.toUpperCase(), stream, model, token);
            intensionOperations.push(response);
          }
          break;
        }
        case 'SET': {
          const vmName = intensions[i].VM ? intensions[i].VM : intensions[i].operation_value;
          const responses = await setIntensionHandler(intensions[i].operation.toUpperCase(), vmName, stream, model, token);
          for (const response of responses) {
            intensionOperations.push(response);
          }
          break;
        }
      }
    }

    if (intensionOperations.length === 0) {
      stream.markdown('I am not sure what you are asking me to do, please try again with a more defined input.');
      return { metadata: { command: '' } };
    } else if (intensionOperations.length === 1) {
      stream.markdown(intensionOperations[0].operation);
      return { metadata: { command: '' } };
    } else {
      const response = await processCopilotOperationResponse(intensionOperations, model, token);

      stream.markdown(response);

      return { metadata: { command: '' } };
    }
  }
};