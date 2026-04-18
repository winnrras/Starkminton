"use client";

import { useAppStore } from "@/lib/store";
import { createBluetoothClient } from "@/lib/bluetooth";
import { createMockGenerator } from "@/lib/mock";
import { Button, Switch } from "@heroui/react";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function ConnectionPanel() {
  const connection = useAppStore((s) => s.connection);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const setDeviceName = useAppStore((s) => s.setDeviceName);
  const setMockMode = useAppStore((s) => s.setMockMode);
  const addHit = useAppStore((s) => s.addHit);
  const activeSession = useAppStore((s) => s.activeSession);
  const startSession = useAppStore((s) => s.startSession);

  const btClientRef = useRef<ReturnType<typeof createBluetoothClient> | null>(
    null
  );
  const mockGenRef = useRef<ReturnType<typeof createMockGenerator> | null>(
    null
  );

  useEffect(() => {
    btClientRef.current = createBluetoothClient({
      onHit: (hit) => {
        if (!useAppStore.getState().activeSession) {
          useAppStore.getState().startSession();
        }
        addHit(hit);
      },
      onDisconnect: () => {
        setConnectionStatus("disconnected");
        setDeviceName(null);
      },
      onError: (err) => {
        setConnectionStatus("error", err);
      },
    });

    if (!btClientRef.current.isSupported()) {
      setConnectionStatus(
        "unsupported",
        "Web Bluetooth not supported. Use Chrome or Edge."
      );
    }

    mockGenRef.current = createMockGenerator((hit) => {
      if (!useAppStore.getState().activeSession) {
        useAppStore.getState().startSession();
      }
      addHit(hit);
    });

    return () => {
      mockGenRef.current?.stop();
    };
  }, [addHit, setConnectionStatus, setDeviceName]);

  async function handleConnect() {
    if (!btClientRef.current) return;
    setConnectionStatus("scanning");
    try {
      const { deviceName } = await btClientRef.current.connect();
      setDeviceName(deviceName);
      setConnectionStatus("connected");
      if (!activeSession) startSession();
    } catch (e: any) {
      setConnectionStatus("error", e.message || "Connection failed");
    }
  }

  function handleDisconnect() {
    btClientRef.current?.disconnect();
    setConnectionStatus("disconnected");
    setDeviceName(null);
  }

  function handleMockToggle(on: boolean) {
    setMockMode(on);
    if (on) {
      if (!activeSession) startSession();
      mockGenRef.current?.start();
    } else {
      mockGenRef.current?.stop();
    }
  }

  const isConnected = connection.status === "connected";
  const isConnecting =
    connection.status === "scanning" || connection.status === "connecting";

  return (
    <div className="flex flex-col gap-4">
      {/* Status chip */}
      <div className="flex items-center justify-between gap-3 rounded-full border border-ink-700 bg-ink-900/60 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <StatusDot status={connection.status} />
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Device
            </span>
            <span className="font-sans text-xs text-stone-200">
              {statusLabel(connection)}
            </span>
          </div>
        </div>

        {isConnected ? (
          <Button
            size="sm"
            variant="flat"
            onClick={handleDisconnect}
            className="h-7 min-w-0 rounded-full bg-ink-800 px-4 text-xs text-stone-300 hover:bg-ink-700"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleConnect}
            isDisabled={
              isConnecting ||
              connection.status === "unsupported" ||
              connection.mockMode
            }
            className="h-7 min-w-0 rounded-full bg-accent px-4 text-xs font-medium text-ink-950 hover:bg-accent/90 disabled:opacity-40"
          >
            {isConnecting ? "Scanning..." : "Connect"}
          </Button>
        )}
      </div>

      {/* Mock mode toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-ink-700 bg-ink-900/40 px-4 py-3">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Dev mode
          </span>
          <span className="font-sans text-sm text-stone-200">Mock hits</span>
        </div>
        <Switch
          isSelected={connection.mockMode}
          onValueChange={handleMockToggle}
          size="sm"
          color="primary"
          classNames={{
            wrapper: "group-data-[selected=true]:bg-accent",
          }}
        />
      </div>

      {/* Error display */}
      {connection.error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">
            Error
          </p>
          <p className="mt-1 font-sans text-xs text-red-300">
            {connection.error}
          </p>
        </motion.div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const config = {
    idle: { color: "#3a3f4b", pulse: false },
    scanning: { color: "#d9ff3f", pulse: true },
    connecting: { color: "#d9ff3f", pulse: true },
    connected: { color: "#d9ff3f", pulse: false },
    disconnected: { color: "#3a3f4b", pulse: false },
    error: { color: "#f87171", pulse: false },
    unsupported: { color: "#f87171", pulse: false },
  }[status] || { color: "#3a3f4b", pulse: false };

  return (
    <span className="relative flex h-2 w-2">
      {config.pulse && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: config.color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
    </span>
  );
}

function statusLabel(conn: {
  status: string;
  deviceName: string | null;
  mockMode: boolean;
}): string {
  if (conn.mockMode) return "Mock mode";
  switch (conn.status) {
    case "idle":
      return "Not connected";
    case "scanning":
      return "Scanning...";
    case "connecting":
      return "Connecting...";
    case "connected":
      return conn.deviceName || "Connected";
    case "disconnected":
      return "Disconnected";
    case "error":
      return "Connection failed";
    case "unsupported":
      return "Browser unsupported";
    default:
      return "Unknown";
  }
}
