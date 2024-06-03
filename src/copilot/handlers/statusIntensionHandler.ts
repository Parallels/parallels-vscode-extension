import * as vscode from 'vscode';
import { ParallelsDesktopService } from '../../services/parallelsDesktopService';
import { CopilotOperation } from '../models';
import { processDeductedValueResponse } from '../training/choose_approximate';

export async function statusIntensionHandler(vmName: string,stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      stream.progress(`Checking the status of the virtual machine ${vmName}...`);
      const vms = await ParallelsDesktopService.getVms();
      let vm = vms.find(vm => vm.Name.toLowerCase() === vmName.toLowerCase());
      if (!vm) {
        const approximateVmName = await processDeductedValueResponse(vmName, vms.map(vm => vm.Name), model, token);
        vm = vms.find(vm => vm.Name.toLowerCase() === approximateVmName.toLowerCase());
        if (!vm) {
          response.operation = `The virtual machine ${vmName} was not found`;
          response.state = 'failed';
          resolve(response);
          return;
        }
      }

      const status = await ParallelsDesktopService.getVmStatus(vm.ID);
      response.operation = `The virtual machine ${vm.Name} is ${status}`;
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