import type { HitData } from "./types";

// Nordic UART Service UUIDs — matches HARDWARE_CONTRACT.md
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // ESP32 → us (notify)
const RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // us → ESP32 (write)

const DEVICE_NAME_PREFIX = "SmashRacket";

export interface BluetoothClient {
  connect(): Promise<{ deviceName: string }>;
  disconnect(): void;
  sendCommand(cmd: string): Promise<void>;
  isSupported(): boolean;
}

export interface BluetoothCallbacks {
  onHit: (hit: Omit<HitData, "id" | "recordedAt">) => void;
  onDisconnect: () => void;
  onError: (err: string) => void;
}

export function createBluetoothClient(
  callbacks: BluetoothCallbacks
): BluetoothClient {
  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let txChar: BluetoothRemoteGATTCharacteristic | null = null;
  let rxChar: BluetoothRemoteGATTCharacteristic | null = null;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  function isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.bluetooth !== "undefined"
    );
  }

  function handleNotification(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    try {
      const text = decoder.decode(value);
      const parsed = JSON.parse(text);

      // Ignore pong responses
      if (parsed.pong) return;

      // Validate — x and y are required. force is optional (mic env hits don't include it).
      if (
        typeof parsed.x !== "number" ||
        typeof parsed.y !== "number"
      ) {
        console.warn("Invalid hit payload — missing x/y", parsed);
        return;
      }

      callbacks.onHit({
        x: clamp(parsed.x, 0, 1),
        y: clamp(parsed.y, 0, 1),
        force: typeof parsed.force === "number" ? parsed.force : 0,
        sweet: typeof parsed.sweet === "boolean" ? parsed.sweet : null,
        deviceTimestamp: typeof parsed.t === "number" ? parsed.t : undefined,
      });
    } catch (e) {
      console.error("Failed to parse BLE notification", e);
    }
  }

  function handleDisconnect() {
    device = null;
    server = null;
    txChar = null;
    rxChar = null;
    callbacks.onDisconnect();
  }

  async function connect(): Promise<{ deviceName: string }> {
    if (!isSupported()) {
      throw new Error(
        "Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop."
      );
    }

    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
        optionalServices: [SERVICE_UUID],
      });
    } catch (e: any) {
      if (e.name === "NotFoundError") {
        throw new Error("No device selected.");
      }
      throw new Error(e.message || "Failed to select device.");
    }

    device.addEventListener("gattserverdisconnected", handleDisconnect);

    if (!device.gatt) {
      throw new Error("Device does not support GATT.");
    }

    server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);

    txChar = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
    rxChar = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);

    txChar.addEventListener("characteristicvaluechanged", handleNotification);
    await txChar.startNotifications();

    return { deviceName: device.name || "Unknown" };
  }

  function disconnect(): void {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    handleDisconnect();
  }

  async function sendCommand(cmd: string): Promise<void> {
    if (!rxChar) throw new Error("Not connected.");
    await rxChar.writeValue(encoder.encode(cmd));
  }

  return {
    connect,
    disconnect,
    sendCommand,
    isSupported,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
