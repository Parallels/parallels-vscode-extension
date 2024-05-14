export interface CatalogManifestItem {
  name: string;
  items: CatalogManifest[];
}

export interface CatalogManifest {
  name:              string;
  id:                string;
  catalog_id:        string;
  description:       string;
  architecture:      string;
  version:           string;
  type:              string;
  tags:              string[];
  path:              string;
  pack_filename:     string;
  metadata_filename: string;
  provider:          Provider;
  created_at:        Date;
  updated_at:        Date;
  required_roles:    string[];
  pack_contents:     PackContent[];
}

export interface PackContent {
  name: string;
  path: string;
}

export interface Provider {
  type:     string;
  host:     string;
  user:     string;
  password: string;
  meta:     Meta;
}

export interface Meta {
  access_key: string;
  bucket:     string;
  region:     string;
  secret_key: string;
}
