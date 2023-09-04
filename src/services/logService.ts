import * as vscode from "vscode";
import axios from "axios";
import {parallelsOutputChannel} from "../helpers/channel";
import {Provider} from "../ioc/provider";
import {TelemetryRequest} from "../models/TelemetryRequest";
import {TelemetryEventIds} from "../constants/flags";
import {TelemetryEventMetadata} from "../models/TelemetryEventMetadata";

enum LogLevel {
  Error = 0,
  Warning = 1,
  Info = 2,
  Debug = 3,
  Verbose = 4
}

export class LogService {
  constructor(private context: vscode.ExtensionContext) {}

  static error(message: string, service?: string, focusOnOutput = false, showOnUi = false) {
    this.log(LogLevel.Error, message, service, focusOnOutput, showOnUi);
  }

  static warning(message: string, service?: string, focusOnOutput = false, showOnUi = false) {
    this.log(LogLevel.Warning, message, service, focusOnOutput, showOnUi);
  }

  static info(message: string, service?: string, focusOnOutput = false, showOnUi = false) {
    this.log(LogLevel.Info, message, service, focusOnOutput, showOnUi);
  }

  static debug(message: string, service?: string, focusOnOutput = false, showOnUi = false) {
    const config = Provider.getConfiguration();
    if (config.isDebugEnabled) {
      this.log(LogLevel.Debug, message, service, focusOnOutput, showOnUi);
    }
  }

  static sendTelemetryEvent(event: TelemetryEventIds, additionalInfo?: string) {
    if (Provider.getConfiguration().isTelemetryEnabled && !Provider.getConfiguration().isDebugEnabled) {
      const now = new Date();
      const formattedDate = now.toISOString().replace("T", " ").replace("Z", "").substr(0, 23);
      const config = Provider.getConfiguration();
      const request: TelemetryRequest = {
        api: 2,
        hwid: config.hardwareId.toLowerCase().replace(/-/g, ""),
        version: config.parallelsDesktopVersion,
        arch: config.architecture,
        hw_model: config.hardwareModel,
        events: [
          {
            event_id: event,
            occured_at: formattedDate,
            version: config.parallelsDesktopVersion,
            os_locale: config.locale,
            os_version: config.osVersion
          }
        ]
      };
      if (additionalInfo) {
        request.events[0].meta = {
          comment: additionalInfo,
          guest_os_version: "Extension",
          license_edition: 2,
          license_type: 2,
          license_status: 1
        };
      }

      LogService.debug(JSON.stringify(request, null, 2), "TelemetryService");

      const requestUrl = `https://reportus.parallels.com/pdfm/${
        Provider.getConfiguration().packerDesktopMajorVersion
      }/events`;
      axios
        .post(requestUrl, request, {
          headers: {
            "Content-Type": "application/json"
          }
        })
        .then(response => {
          LogService.debug(`Telemetry event ${event} sent successfully to ${requestUrl}`, "TelemetryService");
        })
        .catch(error => {
          LogService.error(`Error sending telemetry event ${event} to ${requestUrl}: ${error}`, "TelemetryService");
        });
    }
  }

  static sendHeartbeat() {
    const now = new Date();
    const formattedDate = now.toISOString().replace("T", " ").replace("Z", "").substr(0, 23);
    const config = Provider.getConfiguration();
    const request: TelemetryRequest = {
      api: 2,
      hwid: "00000000000000000000000000000000",
      version: config.parallelsDesktopVersion,
      arch: "",
      hw_model: "",
      events: [
        {
          event_id: TelemetryEventIds.ExtensionStarted,
          occured_at: formattedDate,
          version: "",
          os_locale: "",
          os_version: ""
        }
      ]
    };

    LogService.debug(JSON.stringify(request, null, 2), "TelemetryService");

    const requestUrl = `https://reportus.parallels.com/pdfm/${
      Provider.getConfiguration().packerDesktopMajorVersion
    }/events`;
    axios
      .post(requestUrl, request, {
        headers: {
          "Content-Type": "application/json"
        }
      })
      .then(response => {
        LogService.debug(`Telemetry heartbeat sent successfully to ${requestUrl}`, "TelemetryService");
      })
      .catch(error => {
        LogService.error(`Error sending telemetry heartbeat to ${requestUrl}: ${error}`, "TelemetryService");
      });
  }

  static log(level: LogLevel, messageValue: any, service?: string, focusOnOutput = false, showOnUi = false) {
    let message = "";
    if (messageValue === undefined || messageValue === null || messageValue === "") {
      return;
    }

    if (typeof messageValue !== "string") {
      if (messageValue instanceof Error) {
        message = messageValue.message;
      } else {
        return;
      }
    } else {
      message = messageValue;
    }

    message = message.replace(/\n$/, "");
    message = message.replace(/\r$/, "");
    const config = Provider.getConfiguration();
    const now = new Date();
    const formattedDate = now.toLocaleString();
    let logMessage = "";
    if (service) {
      logMessage += `[${service}] `;
    }
    switch (level) {
      case LogLevel.Error:
        focusOnOutput = true;
        logMessage += `\u{27AC} `;
        break;
      case LogLevel.Warning:
        logMessage += `\u{26A0} `;
        break;
      case LogLevel.Debug:
        logMessage += `\u{1F41E} `;
        break;
      case LogLevel.Verbose:
        logMessage += `\u{2734}`;
        break;
    }

    logMessage += message;
    if (level === LogLevel.Debug && config.isDebugEnabled) {
      parallelsOutputChannel.appendLine(logMessage);
    } else {
      parallelsOutputChannel.appendLine(logMessage);
    }

    if (focusOnOutput) {
      // parallelsOutputChannel.show();
    }
    if (showOnUi) {
      switch (level) {
        case LogLevel.Error:
          vscode.window.showErrorMessage(message);
          break;
        case LogLevel.Warning:
          vscode.window.showWarningMessage(message);
          break;
        case LogLevel.Info:
          vscode.window.showInformationMessage(message);
          break;
      }
    }
  }
}
