import * as vscode from 'vscode';
import { CopilotOperation } from '../models';
import { processPredictiveValueIntension } from '../training/processPredictiveValueIntension';
import { Provider } from '../../ioc/provider';
import { CatalogManifestItem } from '../../models/devops/catalogManifest';

export async function catalogListIntensionHandler(providerName: string, filter: string, context: vscode.ChatContext,stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    
    try {
      if (!filter) {
        filter = 'all';
      }

      stream.progress(`Listing ${filter} manifests on the catalog provider ${providerName}...`);
      const config = Provider.getConfiguration();
      const provider = config.catalogProviders.find(provider => provider.name.toLowerCase() === providerName.toLowerCase());
      if (!provider) {
        const approximateProviderName = await processPredictiveValueIntension(providerName, config.catalogProviders.map(provider => provider.name),context, model, token);
        const provider = config.catalogProviders.find(provider => provider.name.toLowerCase() === approximateProviderName.toLowerCase());
        if (!provider) {
          response.operation = `The catalog provider ${providerName} was not found`;
          response.state = 'failed';
          resolve(response);
          return;
        }
      }
      const manifests: CatalogManifestItem[] = []
      switch (filter.toUpperCase()) {
        case 'ALL': {
          manifests.push(...provider?.manifests??[]);
          break;
        }
        case 'TAINTED': {
          for (const manifest of provider?.manifests??[]) {
            for (const item of manifest.items) {
              if (item.tainted) {
                manifests.push(manifest);
                break;
              }
            }
          }
          break;
        }
        case 'REVOKED': {
          for (const manifest of provider?.manifests??[]) {
            for (const item of manifest.items) {
              if (item.revoked) {
                manifests.push(manifest);
                break;
              }
            }
          }
          break;
        }
        case 'AVAILABLE': {
          for (const manifest of provider?.manifests??[]) {
            let isTaintedOrRevoked = false;
            for (const item of manifest.items) {
              if (item.tainted || item.revoked) {
                isTaintedOrRevoked = true;
                break;
              }
            }
            if (!isTaintedOrRevoked) {
              manifests.push(manifest);
            }
          }
          break;
        }
      }
      if (manifests.length === 0) {
        response.operation = `No manifests found for the filter ${filter}`;
        response.state = 'failed';
        resolve(response);
        return;
      }
      response.operation = `There ${manifests.length > 1 ? 'are' : 'is'} ${manifests.length} ${filter} manifests in ${provider?.name}:\n - ${manifests.map(vm => vm.name).join('\n - ')}`;
      response.state = 'success';

      resolve(response);
    } catch (error) {
      console.error(error);
      response.operation = `Failed to get the manifests from the catalog provider ${providerName}`;
      response.state = 'failed';
      resolve(response);
    }
  });
}