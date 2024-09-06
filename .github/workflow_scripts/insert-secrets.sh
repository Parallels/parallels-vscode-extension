#!/bin/bash
# inserting the AMPLITUDE KEY
echo "Inserting the Amplitude Key"
sed -i "s/export const AMPLITUDE_API_KEY = \".*\"/export const AMPLITUDE_API_KEY = \""$AMPLITUDE_API_KEY"\"/g" ./src/telemetry/telemetryService.ts

echo "Inserting Parallels Catalog Users"
sed -i "s/export const PARALLELS_CATALOG_URL = \".*\"/export const PARALLELS_CATALOG_URL = \""$PARALLELS_CATALOG_URL"\"/g" ./src/services/configurationService.ts
sed -i "s/export const PARALLELS_CATALOG_PRO_USER = \".*\"/export const PARALLELS_CATALOG_PRO_USER = \""$PARALLELS_CATALOG_PRO_USER"\"/g" ./src/services/configurationService.ts
sed -i "s/export const PARALLELS_CATALOG_PRO_PASSWORD = \".*\"/export const PARALLELS_CATALOG_PRO_PASSWORD = \""$PARALLELS_CATALOG_PRO_PASSWORD"\"/g" ./src/services/configurationService.ts
sed -i "s/export const PARALLELS_CATALOG_BUSINESS_USER = \".*\"/export const PARALLELS_CATALOG_BUSINESS_USER = \""$PARALLELS_CATALOG_BUSINESS_USER"\"/g" ./src/services/configurationService.ts
sed -i "s/export const PARALLELS_CATALOG_BUSINESS_PASSWORD = \".*\"/export const PARALLELS_CATALOG_BUSINESS_PASSWORD = \""$PARALLELS_CATALOG_BUSINESS_PASSWORD"\"/g" ./src/services/configurationService.ts
