import {CatalogCacheResponse} from "../parallels/catalog_cache_response";
import {CatalogManifestItem} from "./catalogManifest";
import {HostHardwareInfo} from "./hardwareInfo";
import {DevOpsRolesAndClaims} from "./rolesAndClaims";
import {DevOpsUser} from "./users";

export interface DevOpsCatalogHostProvider {
  class: "DevOpsCatalogHostProvider";
  authToken?: string;
  user?: DevOpsUser;
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
  users?: DevOpsUser[];
  roles?: DevOpsRolesAndClaims[];
  claims?: DevOpsRolesAndClaims[];
  hardwareInfo?: HostHardwareInfo;
  catalogCache?: CatalogCacheResponse;
  lastUpdatedHardwareInfo?: string;
}
