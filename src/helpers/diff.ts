export function diff(obja: any, objb: any): boolean {
  const jsonObjA = JSON.stringify(obja);
  const jsonObjB = JSON.stringify(objb);
  if (jsonObjA === jsonObjB) {
    return false;
  }
  return true;
}

export function diffArray(arrayA: any[], arrayB: any[], field: string): boolean {
  if (Array.isArray(arrayA)) {
    arrayA.sort((a, b) => {
      return a[field].localeCompare(b[field]);
    });
  }
  if (Array.isArray(arrayB)) {
    arrayB.sort((a, b) => {
      return a[field].localeCompare(b[field]);
    });
  }

  const jsonObjA = JSON.stringify(arrayA);
  const jsonObjB = JSON.stringify(arrayB);
  if (jsonObjA === jsonObjB) {
    return false;
  }

  return true;
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null) return false;
  const keysA = Object.keys(a),
    keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function hasPassed24Hours(lastUpdated: string, minutes: number): boolean {
  if (!lastUpdated) {
    return true;
  }
  if (minutes <= 0) {
    minutes = 1440;
  }

  let milliseconds = minutes * 60000;
  if (milliseconds <= 0) {
    milliseconds = 86400000;
  }

  const lastUpdatedDate = new Date(lastUpdated);
  const now = new Date();
  const diff = now.getTime() - lastUpdatedDate.getTime();
  return diff > milliseconds;
}
