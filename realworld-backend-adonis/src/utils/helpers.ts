import { v4 as uuidv4 } from 'uuid';

let commentIdCounter = 1;

export function uuid(): string {
  return uuidv4();
}

export function nextId(): number {
  return commentIdCounter++;
}

export function getNestedValue(obj: any, path: string): any {
  const keys = path.replace(/\["/g, '.').replace(/"]/g, '').split('.');
  let result = obj;
  for (const key of keys) {
    if (result === undefined || result === null) return undefined;
    result = result[key];
  }
  return result;
}
