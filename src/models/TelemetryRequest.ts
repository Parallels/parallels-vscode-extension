import {TelemetryEvent} from "./TelemetryEvent";

export interface TelemetryRequest {
  api: number;
  hwid: string;
  version: string;
  arch: string;
  hw_model: string;
  events: TelemetryEvent[];
}
