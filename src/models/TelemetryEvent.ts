import { TelemetryEventMetadata } from "./TelemetryEventMetadata";


export interface TelemetryEvent {
  event_id: number;
  occured_at: string;
  version: string;
  os_locale: string;
  os_version: string;
  meta?: TelemetryEventMetadata;
}
