export interface CatalogCacheResponse {
  total_size: number;
  host_id: string;
  manifests: CatalogCacheResponseManifest[];
}

export function createEmptyCatalogCacheResponse(): CatalogCacheResponse {
  return {
    total_size: 0,
    host_id: "",
    manifests: []
  };
}

export function calcTotalCacheSize(catalogCache: CatalogCacheResponse): number {
  return catalogCache.manifests.reduce((acc, manifest) => acc + manifest.size, 0);
}

export function getCacheManifestsItemsFromResponse(
  catalogCache: CatalogCacheResponse,
  hostId = ""
): CatalogCacheResponseManifest[] {
  return getCacheManifestsItems(catalogCache.manifests, hostId);
}

export function updateCurrentCacheManifestsItems(
  existingManifest: CatalogCacheResponseManifest[],
  newManifests: CatalogCacheResponseManifest[]
): CatalogCacheResponseManifest[] {
  const updatedManifestsMap = new Map<string, CatalogCacheResponseManifest>();

  newManifests.forEach(manifest => {
    const key = `${manifest.catalog_id}-${manifest.version}-${manifest.host_id}-${manifest.architecture}`;
    updatedManifestsMap.set(key, manifest);
  });

  existingManifest.forEach(manifest => {
    const key = `${manifest.catalog_id}-${manifest.version}-${manifest.host_id}-${manifest.architecture}`;
    if (updatedManifestsMap.has(key)) {
      updatedManifestsMap.set(key, {...manifest, ...updatedManifestsMap.get(key)});
    }
  });

  return Array.from(updatedManifestsMap.values());
}

export function getCacheManifestsItems(
  catalogCacheManifests: CatalogCacheResponseManifest[],
  hostId = ""
): CatalogCacheResponseManifest[] {
  if (hostId === "") {
    return catalogCacheManifests.filter(
      (m, index, self) => index === self.findIndex(t => t.catalog_id === m.catalog_id && t.host_id === m.host_id)
    );
  } else {
    return catalogCacheManifests.filter(
      (m, index, self) => index === self.findIndex(t => t.catalog_id === m.catalog_id && t.host_id === hostId)
    );
  }
}

export interface CatalogCacheResponseManifest {
  name: string;
  id: string;
  host_id: string;
  catalog_id: string;
  architecture: string;
  version: string;
  type: string;
  tags: string[];
  size: number;
  path: string;
  created_at: Date;
  updated_at: Date;
  required_roles: string[];
  pack_contents: CatalogCacheResponsePackContent[];
  cache_date: Date;
  cache_local_path: string;
  cache_metadata_name: string;
  cache_file_name: string;
  cache_type: string;
  cache_size: number;
  description?: string;
  provider?: CatalogCacheResponseProvider;
}

export interface CatalogCacheResponsePackContent {
  name: string;
  path: string;
  created_at: Date;
  updated_at: Date;
  hash?: string;
}

export interface CatalogCacheResponseProvider {
  type: string;
  meta: CatalogCacheResponseMeta;
}

export interface CatalogCacheResponseMeta {
  access_key: string;
  bucket: string;
  region: string;
  secret_key: string;
  user: string;
}
