import * as vscode from 'vscode';
import { CopilotOperation } from '../models';
import { Provider } from '../../ioc/provider';
import { DevOpsCatalogHostProvider } from '../../models/devops/catalogHostProvider';

export async function catalogCountIntensionHandler(filter: string,stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      if (!filter) {
        filter = 'all';
      }
      if (filter === 'available' || filter === 'healthy') {
        filter = 'active';
      }
      if (filter === 'unavailable' || filter === 'unhealthy') {
        filter = 'inactive';
      }

      stream.progress(`Listing ${filter} catalog providers...`);
      const config = Provider.getConfiguration();
      const catalogProviders: DevOpsCatalogHostProvider[] = []
      switch (filter.toUpperCase()) {
        case 'ALL': {
          catalogProviders.push(...config.catalogProviders);
          if (catalogProviders.length === 0) {
            response.operation = `No catalog providers found`;
            response.state = 'failed';
            resolve(response);
            return;
          }
          break;
        }
        case 'ACTIVE': {
          catalogProviders.push(...config.catalogProviders.filter(provider => provider.state === 'active'));
          if (catalogProviders.length === 0) {
            response.operation = `No active catalog providers found`;
            response.state = 'failed';
            resolve(response);
            return;
          }
          break;
        }
        case 'INACTIVE': {
          catalogProviders.push(...config.catalogProviders.filter(provider => provider.state === 'inactive'));
          if (catalogProviders.length === 0) {
            response.operation = `No inactive catalog providers found`;
            response.state = 'failed';
            resolve(response);
            return;
          }
          break;
        }
      }
      if (catalogProviders.length === 0) {
        response.operation = `No catalog providers found for the filter ${filter}`;
        response.state = 'failed';
        resolve(response);
        return;
      }
      response.operation = `There ${catalogProviders.length > 1 ? 'are' : 'is'} ${catalogProviders.length} ${filter} catalog providers:\n - ${catalogProviders.map(vm => vm.name).join('\n - ')}`;
      response.state = 'success';

      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the ${filter} catalog providers`;
      response.state = 'failed';
      resolve(response);
    }
  });
}