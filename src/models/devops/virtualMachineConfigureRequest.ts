export interface DevOpsVirtualMachineConfigureRequest {
  operations: DevOpsVirtualMachineConfigureRequestOperation[];
}

export interface DevOpsVirtualMachineConfigureRequestOperation {
  group: string;
  operation: string;
  value?: string;
  options?: DevOpsVirtualMachineConfigureRequestOption[];
}

export interface DevOpsVirtualMachineConfigureRequestOption {
  flag: string;
  value: string;
}
