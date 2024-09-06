import {Provider} from "../../../ioc/provider";
import {ConfigurationService} from "../../../services/configurationService";
import {LogService} from "../../../services/logService";
import {ParallelsDesktopService} from "../../../services/parallelsDesktopService";

export async function injectAppId(catalogId: string, machineId: string): Promise<boolean> {
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
        await ParallelsDesktopService.executeOnVm(machineId, `echo "${appId}" > /home/.parallels_app_id`).catch(() => {
          foundError = true;
        });

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
}
