import * as vscode from 'vscode';
import { ParallelsDesktopService } from '../../services/parallelsDesktopService';
import { CopilotOperation } from '../models';
import { VirtualMachine } from '../../models/parallels/virtualMachine';
import { processDeductedValueResponse } from '../training/choose_approximate';

export async function setIntensionHandler(operation: string, vmName: string, stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken): Promise<CopilotOperation[]> {
  return new Promise(async (resolve, reject) => {
    const responses: CopilotOperation[] = []
    try {
      let vms: VirtualMachine[] = []
      if (vmName === 'all') {
        switch (operation.toUpperCase()) {
          case 'START': {
            stream.progress(`finding the virtual machines to start...`);
            vms = (await ParallelsDesktopService.getVms()).filter(vm => vm.State === 'stopped');
            break;
          }
          case 'STOP': {
            stream.progress(`finding the virtual machines to stop...`);
            vms = (await ParallelsDesktopService.getVms()).filter(vm => vm.State === 'running');
            break;
          }
          case 'RESTART': {
            stream.progress(`finding the virtual machines to restart...`);
            vms = (await ParallelsDesktopService.getVms()).filter(vm => vm.State === 'running');
            break;
          }
          case 'PAUSE': {
            stream.progress(`finding the virtual machines to pause...`);
            vms = (await ParallelsDesktopService.getVms()).filter(vm => vm.State === 'running');
            break;
          }
          case 'RESUME': {
            stream.progress(`finding the virtual machines to resume...`);
            vms = (await ParallelsDesktopService.getVms()).filter(vm => vm.State === 'paused' || vm.State === 'suspended');
            break;
          }
          case 'SUSPEND': {
            stream.progress(`finding the virtual machines to suspend...`);
            vms = (await ParallelsDesktopService.getVms()).filter(vm => vm.State === 'running');
            break;
          }
          default: {
            stream.progress(`finding all the virtual machines...`);
            vms = (await ParallelsDesktopService.getVms());
            break;
          }
        }
      } else {
        stream.progress(`finding the virtual machine ${vmName}...`);
        const vms = await ParallelsDesktopService.getVms();
        let vm = vms.find(vm => vm.Name.toLowerCase() === vmName.toLowerCase());
        if (vm) {
          vms.push(vm);
        } else {
          const approximateVmName = await processDeductedValueResponse(vmName, vms.map(vm => vm.Name), model, token);
          vm = vms.find(vm => vm.Name.toLowerCase() === approximateVmName.toLowerCase());
          if (vm) {
            vms.push(vm);
          }
        }
      }

      if (vms.length === 0) {
        const response: CopilotOperation = {
          operation: `The virtual machine ${vmName} does not exist`,
          state: 'failed'
        };
        responses.push(response);
        resolve(responses);
        return;
      }

      for (const vm of vms) {
        const response: CopilotOperation = {
          operation: '',
          state: 'failed'
        };
        switch (operation.toUpperCase()) {
          case 'START':
            if (vm.State === 'running') {
              response.operation = `The virtual machine ${vm.Name} is already running`;
              response.state = 'success';
              responses.push(response);
              if (vms.length > 1) {
                stream.progress(`The virtual machine ${vm.Name} is already running`);
              }
              break;
            }

            stream.progress(`Starting the virtual machine ${vm.Name}...`);
            try {
              await ParallelsDesktopService.startVm(vm.ID);
                response.operation = `Machine ${vm.Name} has been started`;
              response.state = 'success';
              responses.push(response);
              stream.progress(`Machine ${vm.Name} has been started`);
            } catch (error) {
              stream.progress(`Failed to start the virtual machine ${vm.Name}`);
              response.operation = `Failed to start the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          case 'STOP':
            try {
              if (vm.State === 'stopped') {
                response.operation = `The virtual machine ${vm.Name} is already stopped`;
                response.state = 'success';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is already stopped`);
                }
                return;
              }
              if (vm.State === 'suspended' || vm.State === 'paused') {
                response.operation = `The virtual machine ${vm.Name} is ${vm.State}, you need to resume it before stopping it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is ${vm.State}, you need to resume it before stopping it`);
                }
                return;
              }
              stream.progress(`Stopping the virtual machine ${vm.Name}...`);
              await ParallelsDesktopService.stopVm(vm.ID);
              response.operation = `Machine ${vm.Name} has been stopped`;
              response.state = 'success';
              responses.push(response);
            } catch (error) {
              response.operation = `Failed to stop the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          case 'RESTART':
            try {
              if (vm.State === 'suspended' || vm.State === 'paused') {
                response.operation = `The virtual machine ${vm.Name} is ${vm.State}, you need to resume it before restarting it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is ${vm.State}, you need to resume it before restarting it`);
                }
                return;
              }
              stream.progress(`Restarting the virtual machine ${vm.Name}...`);
              await ParallelsDesktopService.stopVm(vm.ID);
              await ParallelsDesktopService.startVm(vm.ID);
              response.operation = `Machine ${vm.Name} has been restarted`;
              response.state = 'success';
              responses.push(response);
            } catch (error) {
              response.operation = `Failed to restart the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          case 'PAUSE':
            try {
              if (vm.State === 'paused') {
                response.operation = `The virtual machine ${vm.Name} is already paused`;
                response.state = 'success';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is already paused`);
                }
                return;
              }
              if (vm.State === 'suspended') {
                response.operation = `The virtual machine ${vm.Name} is suspended, you need to resume it before pausing it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is suspended, you need to resume it before pausing it`);
                }
                return;
              }
              if (vm.State === 'stopped') {
                response.operation = `The virtual machine ${vm.Name} is stopped, you need to start it before pausing it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is stopped, you need to start it before pausing it`);
                }
                return;
              }
              stream.progress(`Pausing the virtual machine ${vm.Name}...`);
              await ParallelsDesktopService.pauseVm(vm.ID);
              response.operation = `Machine ${vm.Name} has been paused`;
              response.state = 'success';
              responses.push(response);
            } catch (error) {
              response.operation = `Failed to pause the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          case 'RESUME':
            try {
              if (vm.State === 'running') {
                response.operation = `The virtual machine ${vm.Name} is already running`;
                response.state = 'success';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is already running`);
                }
                return;
              }
              if (vm.State === 'stopped') {
                response.operation = `The virtual machine ${vm.Name} is stopped, you need to start it before resuming it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is stopped, you need to start it before resuming it`);
                }
                return;
              }
              stream.progress(`Resuming the virtual machine ${vm.Name}...`);
              await ParallelsDesktopService.resumeVm(vm.ID);
              response.operation = `Machine ${vm.Name} has been resumed`;
              response.state = 'success';
              responses.push(response);
            } catch (error) {
              response.operation = `Failed to resume the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          case 'SUSPEND':
            try {
              if (vm.State === 'suspended') {
                response.operation = `The virtual machine ${vm.Name} is already suspended`;
                response.state = 'success';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is already suspended`);
                }
                return;
              }
              if (vm.State === 'stopped') {
                response.operation = `The virtual machine ${vm.Name} is stopped, you need to start it before suspending it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is stopped, you need to start it before suspending it`);
                }
                return;
              }
              if (vm.State === 'paused') {
                response.operation = `The virtual machine ${vm.Name} is paused, you need to resume it before suspending it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is paused, you need to resume it before suspending it`);
                }
                return;
              }

              stream.progress(`Suspending the virtual machine ${vm.Name}...`);
              await ParallelsDesktopService.suspendVm(vm.ID);
              response.operation = `Machine ${vm.Name} has been suspended`;
              response.state = 'success';
              responses.push(response);
            } catch (error) {
              response.operation = `Failed to suspend the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          case 'DELETE':
            try {
              if (vm.State === 'running') {
                response.operation = `The virtual machine ${vm.Name} is running, you need to stop it before deleting it`;
                response.state = 'failed';
                responses.push(response);
                if (vms.length > 1) {
                  stream.progress(`The virtual machine ${vm.Name} is running, you need to stop it before deleting it`);
                }
                return;
              }

              stream.progress(`Deleting the virtual machine ${vm.Name}...`);
              await ParallelsDesktopService.deleteVm(vm.ID);
              response.operation = `Machine ${vm.Name} has been deleted`;
              response.state = 'success';
              responses.push(response);
            } catch (error) {
              response.operation = `Failed to delete the virtual machine ${vm.Name}`;
              response.state = 'failed';
              responses.push(response);
            }
            break;
          default:
            response.operation = `The operation ${operation} is not valid`;
            response.state = 'failed';
            responses.push(response);
            break;
        }
      }
      resolve(responses);
    } catch (error) {
      const response: CopilotOperation = {
        operation: '',
        state: 'failed'
      };
      console.error(error);
      response.operation = `Failed to ${operation} the virtual machine ${vmName}`;
      response.state = 'failed';
      responses.push(response);
      resolve(responses);
    }
  });
}