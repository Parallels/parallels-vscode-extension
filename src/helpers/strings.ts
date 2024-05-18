export function cleanString(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}
