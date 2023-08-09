export interface FeatureFlags {
  enableTelemetry: boolean | undefined;
  hardwareId: string | undefined;
  platform: string | undefined;
  version: string | undefined;
  hardwareModel: string | undefined;
  serverVersion: string | undefined;
  osVersion: string | undefined;
}
