# Hardware Contract

This document specifies the data format the dashboard expects from the ESP32. **Firmware team (Babega, Barrack): please build to this spec.** If you need changes, ping the dashboard team first so we can update together.

## Transport: Bluetooth Low Energy (BLE)

The ESP32 should advertise as a BLE peripheral. The dashboard connects using the Web Bluetooth API.

### Service & Characteristic UUIDs

```
Service UUID:          6e400001-b5a3-f393-e0a9-e50e24dcca9e
Hit Data (notify):     6e400003-b5a3-f393-e0a9-e50e24dcca9e
Command (write):       6e400002-b5a3-f393-e0a9-e50e24dcca9e
```

These are the standard Nordic UART Service UUIDs — the ESP32 Arduino BLE library has examples using exactly these.

### Device Name

Advertise with a name starting with `SmashRacket` (e.g. `SmashRacket-01`). The dashboard filters for this prefix when scanning.

---

## Hit Data Format

When a hit is detected, send a **single JSON string** over the Hit Data characteristic (notification). Example:

```json
{"x":0.52,"y":0.48,"force":874.3,"sweet":true,"t":12345}
```

### Fields

| Field   | Type    | Range          | Description |
|---------|---------|----------------|-------------|
| `x`     | number  | `0.0` to `1.0` | Normalized X position on string bed. `0` = left edge, `1` = right edge. |
| `y`     | number  | `0.0` to `1.0` | Normalized Y position on string bed. `0` = top (tip of racket), `1` = bottom (throat). |
| `force` | number  | `0` to `~1500` | Force value from piezo signal (raw or calibrated — just be consistent). |
| `sweet` | boolean | —              | `true` if Barrack's frequency analysis classifies this as a sweet-spot hit. |
| `t`     | number  | —              | Milliseconds since the ESP32 booted. Used for ordering hits. |

### JSON rules

- Must be valid JSON, UTF-8 encoded
- Keep keys short (single letters where possible) — BLE MTU is ~185 bytes after overhead
- If `sweet` is unknown (mic data not ready yet), omit the field or send `null` — don't send `false` as a default
- Send one hit per notification — don't batch

---

## Commands (Dashboard → ESP32)

The dashboard may write these commands to the Command characteristic:

| Command | Description |
|---------|-------------|
| `"ping"` | Health check. ESP32 should respond on Hit Data with `{"pong":true}`. |
| `"reset"` | Reset session counters on the ESP32. No response required. |
| `"calibrate"` | Enter calibration mode for piezo triangulation. |

---

## Example Arduino pseudo-code

```cpp
// When hit detected in main loop:
StaticJsonDocument<128> doc;
doc["x"] = hitX;           // float 0..1
doc["y"] = hitY;           // float 0..1
doc["force"] = peakForce;  // float
doc["sweet"] = isSweet;    // bool from mic FFT
doc["t"] = millis();

char buf[150];
size_t len = serializeJson(doc, buf);
pTxCharacteristic->setValue((uint8_t*)buf, len);
pTxCharacteristic->notify();
```

---

## Testing Without Firmware

The dashboard has a **Mock Mode** toggle that generates synthetic hits matching this exact format, so the dashboard team doesn't block on firmware.

---

## Open Questions / TBD

- [ ] Confirm `force` units — raw ADC, Newtons, or arbitrary 0-1000 scale?
- [ ] Max expected hit frequency (hits per second) — need to know for BLE throughput
- [ ] Should we send idle heartbeats, or only on hit?
