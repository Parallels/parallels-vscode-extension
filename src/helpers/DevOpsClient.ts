import {Provider} from "../ioc/provider";
import {TELEMETRY_PARALLELS_CATALOG} from "../telemetry/operations";

export async function generateDevOpsClient(catalogId: string, version: string): Promise<string> {
  const telemetry = Provider.telemetry();

  const event = {
    event: TELEMETRY_PARALLELS_CATALOG,
    properties: [
      {name: "operation", value: "PD-VSCODE::CATALOG_PULL_MANIFEST"},
      {name: "operation_value", value: `${catalogId}-${version}`}
    ]
  };

  const amplitudeEvent = await telemetry.generateDefaultEventValues(event);
  const result = {
    event_type: "PD-VSCODE::CATALOG_PULL_MANIFEST",
    origin: "vscode",
    event_properties: {},
    user_id: "vscode",
    device_id: "vscode"
  };

  const property: any = {};
  for (const prop of amplitudeEvent.properties ?? []) {
    property[prop.name] = prop.value;
  }

  result.event_properties = property;
  if (amplitudeEvent.properties?.find(p => p.name === "user_id")) {
    result.user_id = amplitudeEvent.properties.find(p => p.name === "user_id")?.value ?? "vscode";
  }

  if (amplitudeEvent.properties?.find(p => p.name === "device_id")) {
    result.device_id = amplitudeEvent.properties.find(p => p.name === "device_id")?.value ?? "vscode";
  }

  const json = JSON.stringify(result).replaceAll("user_id", "app_id");

  return Buffer.from(json).toString("base64");
}
