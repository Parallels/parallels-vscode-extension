import {VirtualMachineMetadata} from "../../../models/parallels/VirtuaMachineMetadata";
import {Provider, telemetryService} from "../../../ioc/provider";
import {ConfigurationService} from "../../../services/configurationService";
import {LogService} from "../../../services/logService";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";
import fs from "fs";

export async function injectAppId(providerHost: string, catalogId: string, machineId: string): Promise<boolean> {
  if (!machineId) {
    return false;
  }

  const config = Provider.getConfiguration();
  let appId = `vscode::${config.id}`;
  const license = config.parallelsDesktopServerInfo?.License?.serial ?? "Unknown";
  if (license && license !== "Unknown") {
    appId = `${appId}::${license.replaceAll("-", "").replaceAll(" ", "").replaceAll("*", "").trim()}`;
  } else {
    appId = `${appId}::Unknown`;
  }
  const licenseEdition = await ConfigurationService.getLicenseType(true);
  if (licenseEdition) {
    appId = `${appId}::${licenseEdition}`;
  } else {
    appId = `${appId}::Unknown`;
  }
  if (config.tools.parallelsDesktop?.version) {
    appId = `${appId}::${config.tools.parallelsDesktop.version.replaceAll("Desktop ", "")}`;
  } else {
    appId = `${appId}::Unknown`;
  }
  appId = `${appId}::${catalogId}`;

  try {
    const vm = await ParallelsDesktopService.getVmPath(machineId);
    if (vm != undefined && vm.Home === "" && fs.existsSync(vm.Home)) {
      const metadata: VirtualMachineMetadata = {
        Data: [
          {
            Key: "appId",
            Value: appId
          },
          {
            Key: "catalogId",
            Value: catalogId
          },
          {
            Key: "origin",
            Value: "vscode"
          },
          {
            Key: "providerHost",
            Value: providerHost
          }
        ]
      };
      fs.writeFileSync(`${vm.Home}/.metadata.json`, JSON.stringify(metadata));
    }

    // awaiting for the status to be reported
    let retry = 40;
    while (true) {
      const result = await ParallelsDesktopService.getVmStatus(machineId);
      let foundError = false;
      if (result === "running") {
        let ready = true;
        ParallelsDesktopService.executeOnVm(machineId, `echo ehlo`).catch(() => {
          ready = false;
          foundError = true;
        });
        if (ready) {
          await ParallelsDesktopService.executeOnVm(machineId, `echo "${appId}" > /home/.parallels_app_id`).catch(
            () => {
              foundError = true;
            }
          );

          await ParallelsDesktopService.executeOnVm(machineId, `chmod 0777 /home/.parallels_app_id`).catch(reject => {
            foundError = true;
          });
        }

        if (!foundError) {
          break;
        }
      }

      if (retry === 0) {
        LogService.error(
          `Virtual machine ${machineId} is not running, we were unable to inject the machineId`,
          "ParallelsCatalogProvider"
        );
        break;
      }
      retry--;
    }

    return true;
  } catch (error) {
    LogService.error(`Error injecting appId into virtual machine ${machineId}`);
    telemetryService.track({
      event: "parallels_catalog_inject_app_id",
      properties: [
        {
          name: "error",
          value: "injecting app id"
        }
      ]
    });
    return true;
  }
}
