import {Memento} from "vscode";

export class LocalStorageService {
  constructor(private context: Memento) {}

  get(key: string): any {
    return this.context.get(key);
  }

  set(key: string, value: any): Thenable<void> {
    return this.context.update(key, value);
  }

  delete(key: string): Thenable<void> {
    return this.context.update(key, undefined);
  }
}
