import * as vscode from 'vscode';
import { processCreateVmIntension } from '../training/create';
import { Provider } from '../../ioc/provider';
import { CatalogManifest, CatalogManifestItem } from '../../models/devops/catalogManifest';
import { ParallelsDesktopService } from '../../services/parallelsDesktopService';
import { CatalogPullRequest } from '../../models/devops/catalogPullRequest';
import { HelperService } from '../../services/helperService';
import { DevOpsService } from '../../services/devopsService';
import { CopilotOperation } from '../models';

export async function createIntensionHandler(userIntension: string,stream: vscode.ChatResponseStream, model: vscode.LanguageModelChat, token: vscode.CancellationToken ): Promise <CopilotOperation> {
  return new Promise(async (resolve, reject) => {
    const response: CopilotOperation = {
      operation: '',
      state: 'failed'
    };
    let vmName = '';
    try {
      const config = Provider.getConfiguration()
      const catalogNames: string[] = config.catalogProviders.map(c => c.name);
      const createOp = await processCreateVmIntension(userIntension, catalogNames, model, token);
      vmName = createOp.name;
      const catalogProvider = config.catalogProviders.find(c => c.name.toLowerCase() === createOp.catalog_manifest.connection.toLowerCase());
      if (!catalogProvider) {
        response.operation = `The catalog provider ${createOp.catalog_manifest.catalog_id} is not available`
        response.state = 'failed';
        resolve(response);
        return;
      }

      const manifests = catalogProvider?.manifests as CatalogManifestItem[];
      let manifest: CatalogManifestItem | undefined;
      for (const catalogId in manifests) {
        const catalogManifest = manifests[catalogId];
        if (catalogManifest.name.toLowerCase() === createOp.catalog_manifest.catalog_id.toLowerCase()) {
          manifest = catalogManifest;
          break;
        }
      }

      if (!manifest) {
        response.operation = `The manifest ${createOp.catalog_manifest.catalog_id} was not found in the catalog provider ${catalogProvider.name}`;
        response.state = 'failed';
        resolve(response);
        return;
      }

      let version: CatalogManifest | undefined;
      for (const item of manifest?.items ?? []) {
        if (item.version === createOp.catalog_manifest.version) {
          version = item;
          break;
        }
      }
      if (!version && manifest?.items.length === 1) {
        createOp.catalog_manifest.version = manifest.items[0].version;
        version = manifest.items[0];
      }

      if (!version) {
        response.operation = `The version ${createOp.catalog_manifest.version} is not available`;
        response.state = 'failed';
        resolve(response);
        return;
      }

      const info = await ParallelsDesktopService.getServerInfo();
      const defaultMachinePath = info["VM home"];
      if (!createOp.architecture) {
        const architecture = await HelperService.getArchitecture();
        createOp.architecture = architecture;
      }

      const pullRequest: CatalogPullRequest = {
        catalog_id: createOp.catalog_manifest.catalog_id,
        version: createOp.catalog_manifest.version,
        architecture: createOp.architecture,
        machine_name: createOp.name,
        path: defaultMachinePath,
        connection: `host=${catalogProvider?.username}:${catalogProvider?.password}@${catalogProvider?.host}`,
        start_after_pull: createOp.start_on_create ?? false
      };
      stream.progress(`Creating the virtual machine ${createOp.name} from ${createOp.catalog_manifest.catalog_id} ...`);

      let foundError = false;
      await DevOpsService.pullManifestFromCatalogProvider(catalogProvider, pullRequest).catch(err => {
        console.error(err);
        foundError = true;
      });
      if (foundError) {
        response.operation = `Failed to create the virtual machine ${createOp.name}`;
        response.state = 'failed';
        resolve(response);
      } else {
        response.operation = `The virtual machine ${createOp.name} has been created`;
        response.state = 'success';
        resolve(response);
      }
    } catch (error) {
      console.error(error);
      response.operation = `Failed to create the virtual machine${vmName ? ` ${vmName}` : ''}`;
      response.state = 'failed';
      resolve(response);
    }
  });
}