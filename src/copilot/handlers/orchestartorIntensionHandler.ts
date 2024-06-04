import * as vscode from 'vscode';
import { CopilotUserIntension } from '../models';
import { CopilotOperation } from '../models';
import { orchestratorStatusIntensionHandler } from './orchestratorStatusIntensionHandler';
import { orchestratorCountIntensionHandler } from './orchestratorCountIntensionHandler';
import { orchestratorListIntensionHandler } from './orchestratorListIntensionHandler';
import { processOrchestratorProviderIntensions } from '../training/processOrchestratorProviderIntensions';

export async function orchestratorIntensionHandler(intension: CopilotUserIntension,context: vscode.ChatContext, stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      const userIntension = intension.intension_description ?? intension.intension;
      const orchestratorProviderIntensions = await processOrchestratorProviderIntensions(userIntension, context, model, token);
      for (const key in orchestratorProviderIntensions) {
        switch (orchestratorProviderIntensions[key].operation.toUpperCase()) {
          case 'COUNT': {
            const statusResponse = await orchestratorCountIntensionHandler(orchestratorProviderIntensions[key].operation_value, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST': {
            const statusResponse = await orchestratorCountIntensionHandler(orchestratorProviderIntensions[key].operation_value, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST_HOSTS': {
            if (!orchestratorProviderIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = 'failed';
              resolve(response);
              return;
            }
    
            const statusResponse = await orchestratorListIntensionHandler(orchestratorProviderIntensions[key].target, orchestratorProviderIntensions[key].operation, orchestratorProviderIntensions[key].operation_value, context, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST_VMS': {
            if (!orchestratorProviderIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = 'failed';
              resolve(response);
              return;
            }
    
            const statusResponse = await orchestratorListIntensionHandler(orchestratorProviderIntensions[key].target, orchestratorProviderIntensions[key].operation, orchestratorProviderIntensions[key].operation_value, context, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'STATUS': {
            if (!orchestratorProviderIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = 'failed';
              resolve(response);
              return;
            }
    
            const statusResponse = await orchestratorStatusIntensionHandler(orchestratorProviderIntensions[key].target, context, stream, model, token);
            resolve(statusResponse);
            break;
          }
          default: {
            response.operation = `The command ${intension.intension} is not supported`;
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