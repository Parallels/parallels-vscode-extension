import * as vscode from 'vscode';
import { CopilotUserIntension } from '../models';
import { CopilotOperation } from '../models';
import { remoteHostCountIntensionHandler } from './remoteHostCountIntensionHandler';
import { remoteHostListIntensionHandler } from './remoteHostListVmsIntensionHandler';
import { remoteHostStatusIntensionHandler } from './remoteHostStatusIntensionHandler';
import { processRemoteHostProviderIntensions } from '../training/processRemoteHostProviderIntensions';

export async function remoteHostIntensionHandler(intension: CopilotUserIntension, context: vscode.ChatContext, stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      const userIntension = intension.intension_description ?? intension.intension;
      const remoteHostIntensions = await processRemoteHostProviderIntensions(userIntension, context, model, token);
      for (const key in remoteHostIntensions) {
        switch (remoteHostIntensions[key].operation.toUpperCase()) {
          case 'COUNT': {
            const statusResponse = await remoteHostCountIntensionHandler(remoteHostIntensions[key].operation_value, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST': {
            const statusResponse = await remoteHostCountIntensionHandler(remoteHostIntensions[key].operation_value, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST_VMS': {
            if (!remoteHostIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = 'failed';
              resolve(response);
              return;
            }
    
            const statusResponse = await remoteHostListIntensionHandler(remoteHostIntensions[key].target, remoteHostIntensions[key].operation_value, context,stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'STATUS': {
            if (!remoteHostIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = 'failed';
              resolve(response);
              return;
            }
    
            const statusResponse = await remoteHostStatusIntensionHandler(remoteHostIntensions[key].target, context,stream, model, token);
            resolve(statusResponse);
            break;
          }
          default: {
            response.operation = `The command ${remoteHostIntensions[key].intension} is not supported`;
            response.state = 'failed';
            resolve(response);
            break;
          }
        }
      }
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the intension ${intension.intension} for the catalog provider ${intension.target}`;
      response.state = 'failed';
      resolve(response);
    }
  });
}