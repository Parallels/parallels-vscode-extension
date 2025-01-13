export function cleanString(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

/**
 * Compares two version strings in the format "x.y.z"
 * @param version1 First version to compare
 * @param version2 Second version to compare
 * @returns -1 if version1 < version2, 0 if version1 = version2, 1 if version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  // Compare major version
  if (v1Parts[0] !== v2Parts[0]) {
    return v1Parts[0] > v2Parts[0] ? 1 : -1;
  }

  // Compare minor version
  if (v1Parts[1] !== v2Parts[1]) {
    return v1Parts[1] > v2Parts[1] ? 1 : -1;
  }

  // Compare patch/build version
  if (v1Parts[2] !== v2Parts[2]) {
    return v1Parts[2] > v2Parts[2] ? 1 : -1;
  }

  // Versions are equal
  return 0;
}
