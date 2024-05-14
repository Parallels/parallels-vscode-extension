export interface MachineSnapshot {
  id: string;
  name: string;
  date: string;
  state: string;
  current: boolean;
  parent: string;
}
