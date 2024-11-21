export function formatMemorySize(memorySizeInMb: number): string {
  if (memorySizeInMb >= 1024 * 1024) {
    if (memorySizeInMb > 1024) {
      memorySizeInMb = memorySizeInMb / 1024;
      return formatMemorySize(memorySizeInMb);
    }

    return `${(memorySizeInMb / (1024 * 1024)).toFixed(2)} TB`;
  } else if (memorySizeInMb >= 1024) {
    return `${(memorySizeInMb / 1024).toFixed(2)} GB`;
  } else {
    return `${memorySizeInMb} MB`;
  }
}

export function formatMemorySizeStr(memorySizeInMb: string): string {
  const memorySize = parseFloat(memorySizeInMb);
  if (isNaN(memorySize)) {
    return "Invalid memory size";
  }

  return formatMemorySize(memorySize);
}

export function formatDuration(value: string): string {
  const minutes = parseFloat(value);
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  let result = "";
  if (days > 0) {
    result += `${days} days, `;
  }
  if (hours > 0) {
    result += `${hours} hours, `;
  }
  result += `${mins} minutes`;

  return result;
}
