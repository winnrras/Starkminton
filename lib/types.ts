export interface HitData {
  id: string;
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  force: number;
  sweet: boolean | null;
  deviceTimestamp?: number;
  recordedAt: number; // ms epoch
}

export interface SessionData {
  id: string;
  name: string | null;
  startedAt: number;
  endedAt: number | null;
  hitCount: number;
  sweetCount: number;
  avgForce: number;
  maxForce: number;
}

export type ConnectionStatus =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "unsupported";

export interface ConnectionState {
  status: ConnectionStatus;
  deviceName: string | null;
  error: string | null;
  mockMode: boolean;
}
