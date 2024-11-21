import * as vscode from "vscode";
import {Provider} from "../../../ioc/provider";
import {CommandsFlags} from "../../../constants/flags";
import {DevOpsRemoteProviderManagementCommand} from "../BaseCommand";
import {DevOpsService} from "../../../services/devopsService";
import {DevOpsRemoteHostsProvider} from "../../devopsRemoteHostProvider/devOpsRemoteHostProvider";
import {DevOpsCatalogProvider} from "../../devopsCatalogProvider/devopsCatalogProvider";
import {DevOpsRolesAndClaimsCreateRequest} from "../../../models/devops/rolesAndClaims";
import {cleanString} from "../../../helpers/strings";
import {DevOpsRemoteHostProvider} from "../../../models/devops/remoteHostProvider";
import {DevOpsCatalogHostProvider} from "../../../models/devops/catalogHostProvider";
import {TELEMETRY_DEVOPS_CATALOG, TELEMETRY_DEVOPS_REMOTE} from "../../../telemetry/operations";
import {ShowErrorMessage} from "../../../helpers/error";
import {ANSWER_YES, YesNoQuestion} from "../../../helpers/ConfirmDialog";
import {DevOpsRemoteHost} from "../../../models/devops/remoteHost";

const registerDevOpsManagementClearAllCatalogCacheItemsCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  const localProvider = provider;
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.catalogCacheClearAllCacheItems, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        localProvider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(providerName, "CLEAR_ALL_CATALOG_CACHE_ITEMS_COMMAND_CLICK");
      if (!item) {
        return;
      }

      const config = Provider.getConfiguration();
      const providerId = item.id.split("%%")[0];
      let provider: DevOpsRemoteHostProvider | DevOpsCatalogHostProvider | undefined = undefined;
      if (item.className === "DevOpsRemoteHostProvider") {
        provider = config.findRemoteHostProviderById(providerId);
      }
      if (item.className === "DevOpsCatalogHostProvider") {
        provider = config.findCatalogProviderByIOrName(providerId);
      }
      if (!provider) {
        ShowErrorMessage(providerName, `Provider ${item.name} not found`);
        return;
      }
      const hostName = provider.name;
      const confirmation = await YesNoQuestion(
        `Are you sure you want to clear all catalog cached items from the host ${hostName}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }
      let foundError = false;
      if ("type" in provider && item.className === "DevOpsRemoteHostProvider") {
        if (item.type === "management.remote_hosts.orchestrator.catalog.cache.manifests") {
          // removing the cache for all hosts in the orchestrator
          for (const host of provider.hosts ?? []) {
            if (!host.enabled || host.state !== "healthy") {
              continue;
            }
            await DevOpsService.clearHostCatalogCache(provider, host.id).catch(() => {
              ShowErrorMessage(providerName, `Failed to clear all catalog cache on ${hostName}`, true);
              foundError = true;
              return;
            });
          }
        } else if (item.type === "management.remote_hosts.orchestrator.host.catalog.cache.manifests") {
          const catalogDetailParts = item.id.split("%%catalog_cache%%")[1];
          if (catalogDetailParts === "") {
            ShowErrorMessage(providerName, `Host ${item.name} cache item not found`);
            return;
          }
          const catalogDetails = catalogDetailParts.split("%%") ?? [];
          const item_host_id = catalogDetails[catalogDetails.length - 6];
          await DevOpsService.clearHostCatalogCache(provider, item_host_id).catch(() => {
            ShowErrorMessage(providerName, `Failed to clear all catalog cache on ${hostName}`, true);
            foundError = true;
            return;
          });
        } else {
          await DevOpsService.clearHostCatalogCache(provider).catch(() => {
            ShowErrorMessage(providerName, `Failed to clear all catalog cache on ${hostName}`, true);
            foundError = true;
            return;
          });
        }
      } else {
        await DevOpsService.clearHostCatalogCache(provider).catch(() => {
          ShowErrorMessage(providerName, `Failed to clear all catalog cache on ${hostName}`, true);
          foundError = true;
          return;
        });
      }

      if (foundError) {
        return;
      }

      vscode.window.showInformationMessage(`Catalog cache was cleared on ${hostName}`);
      if (item.className === "DevOpsRemoteHostProvider") {
        await DevOpsService.refreshRemoteHostProviders(true);
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshRemoteHostProvider);
      }
      if (item.className === "DevOpsCatalogHostProvider") {
        await DevOpsService.refreshCatalogProviders(true);
        vscode.commands.executeCommand(CommandsFlags.devopsRefreshCatalogProvider);
      }
    })
  );
};

export const DevOpsManagementClearAllCatalogCacheItemsCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementClearAllCatalogCacheItemsCommand
};
