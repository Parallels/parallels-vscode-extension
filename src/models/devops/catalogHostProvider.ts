import { CatalogManifestItem } from "./catalogManifest";

export interface DevOpsCatalogHostProvider {
  class: "DevOpsCatalogHostProvider";
  ID: string;
  name: string;
  host?: string;
  port?: number;
  scheme?: string;
  rawHost: string;
  username: string;
  password: string;
  state: "active" | "inactive" | "unknown";
  createdAt?: string;
  updatedAt?: string;
  needsTreeRefresh?: boolean;
  manifests: CatalogManifestItem[];
}