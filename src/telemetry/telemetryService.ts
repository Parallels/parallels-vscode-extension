import {VERSION} from "../constants/flags";
import {DevOpsService} from "../services/devopsService";
import {LogService} from "../services/logService";
import {ParallelsDesktopService} from "../services/parallelsDesktopService";
import {Provider} from "./../ioc/provider";
import * as amplitude from "@amplitude/analytics-node";

export const AMPLITUDE_API_KEY = "";
const AMPLITUDE_EVENT_PREFIX = "PD-VSCODE";
export const EVENT_START = `${AMPLITUDE_EVENT_PREFIX}::START`;
export const EVENT_COPILOT = `${AMPLITUDE_EVENT_PREFIX}::COPILOT`;
export const EVENT_OPERATION = `${AMPLITUDE_EVENT_PREFIX}::OPERATION`;
export const EVENT_ERROR = `${AMPLITUDE_EVENT_PREFIX}::ERROR`;

export interface AmplitudeEventProperty {
  name: string;
  value: string;
}

export interface AmplitudeEvent {
  event: string;
  properties?: AmplitudeEventProperty[];
}

export interface TelemetryOperationOptions {
  operationValue?: string;
  description?: string;
}

export class TelemetryService {
  private userId = "vscode";
  private deviceId = "vscode";
  private license = "";
  private licenseEdition = "";
  private os = "";
  private arch = "";
  private enabled = true;
  private amplitude_api_key = "";
  private pd_version = "";

  constructor(test = false) {
    this.init();
    if (test) {
      this.enabled = true;
    }
  }

  async init() {
    const config = Provider.getConfiguration();
    if (!AMPLITUDE_API_KEY) {
      this.amplitude_api_key = process.env.AMPLITUDE_API_KEY || "";
    } else {
      this.amplitude_api_key = AMPLITUDE_API_KEY;
    }

    if (!this.amplitude_api_key) {
      this.enabled = false;
    }

    await amplitude.init(this.amplitude_api_key, {
      flushIntervalMillis: 100,
      logLevel: amplitude.Types.LogLevel.Error
    }).promise;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setLicense(license: string) {
    this.license = license;
  }

  setLicenseEdition(licenseEdition: string) {
    this.licenseEdition = licenseEdition;
  }

  async generateDefaultEventValues(event: AmplitudeEvent): Promise<AmplitudeEvent> {
    const config = Provider.getConfiguration();
    const waitForLicense = 2000;
    let countWaitForLicense = 10;
    const os = Provider.getOs();
    const arch = Provider.getArchitecture();
    const user_id = `vscode_${config.id ?? "unknown_device"}`;
    this.deviceId = config.id ?? "vscode";
    event.properties = event.properties || [];
    if (VERSION.toString() !== "0.0.0") {
      event.properties.push({
        name: "extension_version",
        value: VERSION
      });
    }

    if (os.toLowerCase() === "darwin") {
      let license = config.parallelsDesktopServerInfo?.License?.serial ?? "Unknown";
      let licenseEdition = config.parallelsDesktopServerInfo?.License?.edition ?? "Unknown";
      let isTrial = "Unknown";
      let licenseModel = "Unknown";
      let jsonLicense = config.ParallelsDesktopLicense;
      if (!jsonLicense) {
        jsonLicense = await ParallelsDesktopService.getJsonLicense();
      }
      licenseEdition = `${jsonLicense.edition.toLowerCase()}`;
      isTrial = `${jsonLicense.is_trial}`;
      licenseModel = `${jsonLicense.product.toLowerCase()}`;

      const pd_version = config.parallelsDesktopServerInfo?.Version ?? "Unknown";

      // Wait for license to be available
      while (!this.license || this.license === "Unknown") {
        countWaitForLicense--;
        if (countWaitForLicense === 0) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, waitForLicense));

        license = config.parallelsDesktopServerInfo?.License?.serial ?? "Unknown";
        licenseEdition = config.parallelsDesktopServerInfo?.License?.edition ?? "Unknown";
      }

      if (license) {
        event.properties.push({
          name: "license",
          value: license.replaceAll("-", "").replaceAll(" ", "").replaceAll("*", "").trim()
        });
        if (this.license != license) {
          this.license = license;
        }
      }

      if (licenseEdition) {
        let licenseEditionValue = licenseEdition;
        if (isTrial === "true") {
          licenseEditionValue = `${licenseEditionValue} (Trial)`;
        }
        event.properties.push({
          name: "license_edition",
          value: licenseEdition
        });
        if (this.licenseEdition != licenseEdition) {
          this.licenseEdition = licenseEdition;
        }
      }

      if (licenseModel !== "Unknown") {
        event.properties.push({
          name: "license_model",
          value: licenseModel
        });
      }

      if (pd_version) {
        event.properties.push({
          name: "pd_version",
          value: pd_version.replaceAll("Desktop ", "").trim()
        });
        if (this.pd_version != pd_version) {
          this.pd_version = pd_version;
        }
      }
    } else {
      event.properties.push({
        name: "license",
        value: "not_supported"
      });
      event.properties.push({
        name: "license_edition",
        value: "not_supported"
      });
      event.properties.push({
        name: "license_model",
        value: "not_supported"
      });
      event.properties.push({
        name: "pd_version",
        value: "not_supported"
      });
    }

    if (os) {
      event.properties.push({
        name: "os",
        value: os
      });
      if (this.os != os) {
        this.os = os;
      }
    }

    if (arch) {
      event.properties.push({
        name: "arch",
        value: arch
      });
      if (this.arch != arch) {
        this.arch = arch;
      }
    }

    event.properties.push({
      name: "user_id",
      value: user_id ?? "vscode"
    });

    event.properties.push({
      name: "device_id",
      value: this.deviceId
    });

    return event;
  }

  async track(event: AmplitudeEvent) {
    if (!this.enabled) {
      return;
    }

    event = await this.generateDefaultEventValues(event);

    const properties: Record<string, string> = {};
    for (const property of event.properties ?? []) {
      properties[property.name] = property.value;
    }

    const r = amplitude
      .track(event.event, properties, {
        user_id: event.properties?.find(p => p.name === "user_id")?.value ?? this.userId
      })
      .promise.then(res => {
        if (res.code !== 200) {
          LogService.error(`Error tracking event: ${event.event}`);
        }
      });
  }

  async sendHeartbeat() {
    const config = Provider.getConfiguration();
    const event: AmplitudeEvent = {
      event: EVENT_START,
      properties: []
    };
    const os = Provider.getOs();
    if (os.toLowerCase() === "darwin") {
      if (config.tools.brew.isInstalled) {
        event.properties?.push({
          name: "brew",
          value: "installed"
        });
      }
      if (config.tools.packer.isInstalled) {
        event.properties?.push({
          name: "packer",
          value: "installed"
        });
      }
      if (config.tools.git.isInstalled) {
        event.properties?.push({
          name: "git",
          value: "installed"
        });
      }
      if (config.tools.vagrant.isInstalled) {
        event.properties?.push({
          name: "vagrant",
          value: "installed"
        });
      }
      if (config.tools.parallelsDesktop.isInstalled) {
        event.properties?.push({
          name: "parallels-desktop",
          value: "installed"
        });
      }
      if (await DevOpsService.isInstalled()) {
        event.properties?.push({
          name: "parallels-devops",
          value: "installed"
        });
      }
    }

    event.properties?.push({
      name: "telemetry",
      value: !config.featureFlags.enableTelemetry ? "disabled" : "enabled"
    });

    this.track(event);
  }

  async sendErrorEvent(code: string, description = "", error: Error | null = null) {
    const properties = [
      {
        name: "error",
        value: code
      }
    ];

    if (error) {
      properties.push({
        name: "error_message",
        value: error.message
      });
    }

    if (description) {
      properties.push({
        name: "description",
        value: description
      });
    }

    this.track({
      event: EVENT_ERROR,
      properties: properties
    });
  }

  async sendOperationEvent(operation: string, operationResult = "", options: TelemetryOperationOptions | null = null) {
    const properties = [
      {
        name: "operation",
        value: operation
      }
    ];

    if (operationResult) {
      properties.push({
        name: "operation_result",
        value: operationResult
      });
    }

    if (options && options?.operationValue) {
      properties.push({
        name: "operation_value",
        value: options?.operationValue
      });
    }

    if (options && options?.description) {
      properties.push({
        name: "description",
        value: options?.description
      });
    }

    this.track({
      event: EVENT_OPERATION,
      properties: properties
    });
  }

  async sendCopilotEvent(intension: string, operation = "", description = "") {
    const properties = [
      {
        name: "intension",
        value: intension
      }
    ];
    if (operation) {
      properties.push({
        name: "operation",
        value: operation
      });
    }

    if (description) {
      properties.push({
        name: "description",
        value: description
      });
    }

    this.track({
      event: EVENT_COPILOT,
      properties: properties
    });
  }

  flush() {
    amplitude.flush();
  }
}
