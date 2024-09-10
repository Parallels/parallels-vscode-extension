export interface CatalogManifestItem {
  name: string;
  description: string;
  items: CatalogManifest[];
}

export interface CatalogManifest {
  name: string;
  id: string;
  catalog_id: string;
  description: string;
  architecture: string;
  version: string;
  type: string;
  tags: string[];
  path: string;
  pack_filename: string;
  metadata_filename: string;
  provider: Provider;
  created_at: Date;
  updated_at: Date;
  required_roles: string[];
  required_claims: string[];
  pack_contents: PackContent[];
  tainted: boolean;
  tainted_by?: string;
  tainted_at?: string;
  untainted_by?: string;
  revoked: boolean;
  revoked_at?: string;
  revoked_by?: string;
  last_downloaded_at?: string;
  last_downloaded_user?: string;
  download_count?: number;
  minimum_requirements?: MinimumSpecsRequirements;
}

export interface PackContent {
  name: string;
  path: string;
}

export interface Provider {
  type: string;
  host: string;
  user: string;
  password: string;
  meta: Meta;
}

export interface Meta {
  access_key: string;
  bucket: string;
  region: string;
  secret_key: string;
}

export interface MinimumSpecsRequirements {
  cpu: number;
  memory: number;
  disk: number;
}
