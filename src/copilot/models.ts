import * as vscode from 'vscode';

export interface ICatChatResult extends vscode.ChatResult {
  metadata: {
      command: string;
  }
}

export interface CopilotUserIntension {
  intension:       string;
  operation:       string;
  operation_value: string;
  VM: string;
  intension_description: string;
}

export interface CopilotOperation {
  operation: string;
  state: 'success' | 'failed';
}

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
