export interface CreateCatalogMachine {
  name: string;
  architecture: string;
  start_on_create: boolean;
  catalog_manifest: CreateCatalogMachineCatalogManifest;
}

export interface CreateCatalogMachineCatalogManifest {
  catalog_id: string;
  version: string;
  connection: string;
}
