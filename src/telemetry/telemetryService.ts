import {DevOpsService} from "../services/devopsService";
import {Provider} from "./../ioc/provider";
import * as amplitude from "@amplitude/analytics-node";

export const AMPLITUDE_API_KEY = "";
const AMPLITUDE_EVENT_PREFIX = "PD-VSCODE";
export const EVENT_START = `${AMPLITUDE_EVENT_PREFIX}-START`;
export const EVENT_COPILOT = `${AMPLITUDE_EVENT_PREFIX}-COPILOT`;
export const EVENT_OPERATION = `${AMPLITUDE_EVENT_PREFIX}-OPERATION`;
export const EVENT_ERROR = `${AMPLITUDE_EVENT_PREFIX}-ERROR`;

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
  private license = "";
  private licenseEdition = "";
  private os = "";
  private arch = "";
  private enabled = true;
  private amplitude_api_key = "";

  constructor(test = false) {
    this.init();
    if (test) {
      this.enabled = true;
    }
  }

  async init() {
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

  async track(event: AmplitudeEvent) {
    const waitForLicense = 2000;
    let countWaitForLicense = 10;
    const config = Provider.getConfiguration();
    this.license = config.parallelsDesktopServerInfo?.License?.serial ?? "Unknown";
    this.licenseEdition = config.parallelsDesktopServerInfo?.License?.edition ?? "Unknown";
    this.os = config.parallelsDesktopServerInfo?.OS ?? "Unknown";
    this.arch = Provider.getArchitecture();

    // Wait for license to be available
    while (!this.license || this.license === "Unknown") {
      countWaitForLicense--;
      if (countWaitForLicense === 0) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, waitForLicense));

      this.license = config.parallelsDesktopServerInfo?.License?.serial ?? "Unknown";
      this.licenseEdition = config.parallelsDesktopServerInfo?.License?.edition ?? "Unknown";
    }

    if (!this.enabled || !config.featureFlags.enableTelemetry) {
      return;
    }

    event.properties = event.properties || [];

    if (this.license) {
      event.properties.push({
        name: "license",
        value: this.license
      });
    }

    if (this.licenseEdition) {
      event.properties.push({
        name: "license_edition",
        value: this.licenseEdition
      });
    }

    if (this.os) {
      event.properties.push({
        name: "os",
        value: this.os
      });
    }

    if (this.arch) {
      event.properties.push({
        name: "arch",
        value: this.arch
      });
    }

    if (this.userId == "vscode" && this.license != "Unknown") {
      const userLicense = this.license.replaceAll("-", "").replaceAll(" ", "").replaceAll("*", "");
      this.userId = `vscode_${userLicense}`;
    }

    const properties: Record<string, string> = {};
    for (const property of event.properties ?? []) {
      properties[property.name] = property.value;
    }
    event.properties.push({
      name: "user_id",
      value: this.userId
    });

    amplitude.track(event.event, properties, {
      user_id: this.userId
    });
  }

  async sendHeartbeat() {
    const config = Provider.getConfiguration();
    const event: AmplitudeEvent = {
      event: EVENT_START
    };
    const os = Provider.getOs();
    if (os.toLowerCase() === "darwin") {
      if (config.tools.brew.isInstalled) {
        event.properties = [
          {
            name: "brew",
            value: "installed"
          }
        ];
      }
      if (config.tools.packer.isInstalled) {
        event.properties = [
          {
            name: "packer",
            value: "installed"
          }
        ];
      }
      if (config.tools.git.isInstalled) {
        event.properties = [
          {
            name: "git",
            value: "installed"
          }
        ];
      }
      if (config.tools.vagrant.isInstalled) {
        event.properties = [
          {
            name: "vagrant",
            value: "installed"
          }
        ];
      }
      if (config.tools.parallelsDesktop.isInstalled) {
        event.properties = [
          {
            name: "parallels-desktop",
            value: "installed"
          }
        ];
      }
      if (await DevOpsService.isInstalled()) {
        event.properties = [
          {
            name: "parallels-devops",
            value: "installed"
          }
        ];
      }
    }
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
