export function diff(obja: any, objb: any): boolean {
  const jsonObjA = JSON.stringify(obja);
  const jsonObjB = JSON.stringify(objb);
  if (jsonObjA === jsonObjB) {
    return false;
  }
  return true;
}

export function diffArray(obja: any, objb: any, field: string): boolean {
  if (Array.isArray(obja)) {
    obja.sort((a, b) => {
      return a[field].localeCompare(b[field]);
    });
  }
  if (Array.isArray(objb)) {
    objb.sort((a, b) => {
      return a[field].localeCompare(b[field]);
    });
  }
  const jsonObjA = JSON.stringify(obja);
  const jsonObjB = JSON.stringify(objb);
  if (jsonObjA === jsonObjB) {
    return false;
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
