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

const registerDevOpsManagementClearCatalogCacheItemCommand = (
  context: vscode.ExtensionContext,
  provider: DevOpsRemoteHostsProvider | DevOpsCatalogProvider
) => {
  const localProvider = provider;
  context.subscriptions.push(
    vscode.commands.registerCommand(CommandsFlags.catalogCacheClearCacheItem, async (item: any) => {
      const telemetry = Provider.telemetry();
      const providerName =
        localProvider instanceof DevOpsCatalogProvider ? TELEMETRY_DEVOPS_CATALOG : TELEMETRY_DEVOPS_REMOTE;
      telemetry.sendOperationEvent(providerName, "CLEAR_CATALOG_CACHE_ITEM_COMMAND_CLICK");
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
      const catalogDetailParts = item.id.split("%%catalog_cache%%")[1];
      if (catalogDetailParts === "") {
        ShowErrorMessage(providerName, `Host ${item.name} cache item not found`);
        return;
      }
      const catalogDetails = catalogDetailParts.split("%%") ?? [];

      let hostName = provider.name;
      let host: DevOpsRemoteHost | undefined;
      let host_id = "";
      if (
        "type" in provider &&
        provider.type === "orchestrator" &&
        (item.type === "management.remote_hosts.orchestrator.catalog.cache.manifests.manifest" ||
          item.type === "management.remote_hosts.orchestrator.host.catalog.cache.manifests.manifest")
      ) {
        const item_host_id = catalogDetails[catalogDetails.length - 6];
        host = provider.hosts?.find(h => h.id === item_host_id);
        if (!host) {
          ShowErrorMessage(providerName, `Host ${item.name} not found`);
          return;
        }
        hostName = host.description === "" ? host.id : host.description;
        host_id = host.id;
      }

      const catalogId = catalogDetails[catalogDetails.length - 4];
      let version = catalogDetails[catalogDetails.length - 3];
      if (version === "unknown") {
        version = "";
      }

      const confirmation = await YesNoQuestion(
        `Are you sure you want to clear all catalog cached items from the host ${hostName}?`
      );

      if (confirmation !== ANSWER_YES) {
        return;
      }
      let foundError = false;

      await DevOpsService.clearHostCatalogCache(provider, host_id, catalogId).catch(() => {
        ShowErrorMessage(providerName, `Failed to clear catalog cache item on ${hostName}`, true);
        foundError = true;
        return;
      });

      if (foundError) {
        return;
      }

      vscode.window.showInformationMessage(`Catalog cache item was removed from ${hostName}`);
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

export const DevOpsManagementClearCatalogCacheItemCommand: DevOpsRemoteProviderManagementCommand = {
  register: registerDevOpsManagementClearCatalogCacheItemCommand
};
