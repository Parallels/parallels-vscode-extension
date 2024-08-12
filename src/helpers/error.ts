import * as vscode from "vscode";
import {Provider} from "../ioc/provider";

export function ShowErrorMessage(module: string, message: string, sendTelemetry = false): void {
  if (sendTelemetry) {
    const telemetry = Provider.telemetry();
    telemetry.sendErrorEvent(module, message);
  }

  vscode.window.showErrorMessage(`${message}`);
}
