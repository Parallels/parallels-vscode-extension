import { CopilotUserIntension } from '../models';
import * as vscode from 'vscode';
import { CopilotOperation } from '../models';
import { catalogStatusIntensionHandler } from './catalogStatusIntensionHandler';
import { catalogListIntensionHandler } from './catalogListIntensionHandler';
import { catalogCountIntensionHandler } from './catalogCountIntensionHandler';
import { processCatalogProviderIntensions } from '../training/processCatalogProviderIntensions';
import { processVmInfoIntensions } from '../training/processVmInfoIntensions';
import { config } from '../../ioc/provider';
import { ParallelsDesktopService } from '../../services/parallelsDesktopService';
import { processPredictiveValueIntension } from '../training/processPredictiveValueIntension';

export async function vmInfoIntensionHandler(intension: CopilotUserIntension,context: vscode.ChatContext, stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      const userIntension = intension.intension_description ?? intension.intension;
      const target = intension.target ?? "";
      if (!target) {
        response.operation = `The target for the intension is missing`;
        response.state = 'failed';
        resolve(response);
        return;
      }

      stream.progress(`Finding VM ${target}`);
      const vms = await ParallelsDesktopService.getVms();
      let vm = vms.find(vm => vm.Name.toLowerCase() === target.toLowerCase());
      if (!vm) {
        const approximateVmName = await processPredictiveValueIntension(target.toLowerCase(), vms.map(vm => vm.Name), context, model, token);
        vm = vms.find(vm => vm.Name.toLowerCase() === approximateVmName.toLowerCase());
        if (!vm) {
          response.operation = `The virtual machine ${target} was not found`;
          response.state = 'failed';
          resolve(response);
          return;
        }
      }
      const vmObject = JSON.stringify(vm);
      stream.progress(`Getting VM ${target} information`);

      const vmInfoIntensions = await processVmInfoIntensions(userIntension, vmObject, context, model, token);
      for (const key in vmInfoIntensions) {
        if (vmInfoIntensions[key].intension_description) {
          response.operation = vmInfoIntensions[key].intension_description;
          response.state = 'success';
          resolve(response);
          return;
        }

        switch (vmInfoIntensions[key].operation.toUpperCase()) {
          case 'COUNT': {
            const statusResponse = await catalogCountIntensionHandler(vmInfoIntensions[key].operation_value, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST': {
            const statusResponse = await catalogCountIntensionHandler(vmInfoIntensions[key].operation_value, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'LIST_MANIFESTS': {
            const statusResponse = await catalogListIntensionHandler(vmInfoIntensions[key].target, vmInfoIntensions[key].operation_value,context, stream, model, token);
            resolve(statusResponse);
            break;
          }
          case 'STATUS': {
            if (vmInfoIntensions[key].target) {
              response.operation = `The target for the intension is missing`;
              response.state = 'failed';
              resolve(response);
              return;
            }

            const statusResponse = await catalogStatusIntensionHandler(vmInfoIntensions[key].target,context, stream, model, token);
            resolve(statusResponse);
            break;
          }
          default: {
            response.operation = `The command ${vmInfoIntensions[key].intension} is not supported`;
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