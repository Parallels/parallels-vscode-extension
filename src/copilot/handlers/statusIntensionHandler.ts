import * as vscode from 'vscode';
import { ParallelsDesktopService } from '../../services/parallelsDesktopService';
import { CopilotOperation } from '../models';

export async function statusIntensionHandler(vmName: string,stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      stream.progress(`Checking the status of the virtual machine ${vmName}...`);
      const vm = (await ParallelsDesktopService.getVms()).find(vm => vm.Name.toLowerCase() === vmName.toLowerCase());
      if (!vm) {
        response.operation = `The virtual machine ${vmName} was not found`;
        response.state = 'failed';
        resolve(response);
        return;
      }

      const status = await ParallelsDesktopService.getVmStatus(vm.ID);
      response.operation = `The virtual machine ${vmName} is ${status}`;
      response.state = 'success';
      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the virtual machine status`;
      response.state = 'failed';
      resolve(response);
    }
  });
}