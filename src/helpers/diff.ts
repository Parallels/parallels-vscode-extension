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
