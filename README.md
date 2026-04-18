# 🏸 Smash Dashboard

Real-time badminton smash analytics dashboard for the hackathon. Connects to an ESP32-powered smart racket via Bluetooth and visualizes hit location, force, and sweet-spot accuracy.

## Team

- **Babega** — ESP32 + MPU6050 + piezo signal processing → hit coordinates
- **Barrack** — MEMS microphone + frequency analysis → sweet-spot detection
- **Aubreyasta** — Webcam pose estimation for smash form (stretch goal)
- **[You]** — Web dashboard (this repo)

## Features

- 🎯 **Live racket heatmap** — every hit plotted on the racket head with the latest hit highlighted
- 💥 **Force tracking** — real-time force readings with session history
- 🎵 **Sweet-spot detection** — tracks how many hits land in the acoustic sweet zone
- 📊 **Session analytics** — start/stop practice sessions, review past performance
- 🔌 **Bluetooth connection** — direct connection to the smart racket, no app required
- 🧪 **Mock mode** — simulates hits for development without hardware

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Hero UI** + **Tailwind CSS** for UI
- **Turso** (SQLite cloud) + **Drizzle ORM** for storage
- **Web Bluetooth API** for hardware connection
- **Framer Motion** for animations

## Setup

```bash
# Install deps
npm install

# Copy env template
cp .env.example .env.local

# For local dev without Turso, the app falls back to a local SQLite file.
# To use Turso (recommended for team sharing):
# 1. Sign up at https://turso.tech
# 2. Create a database: turso db create smash-dashboard
# 3. Get URL: turso db show smash-dashboard --url
# 4. Get token: turso db tokens create smash-dashboard
# 5. Paste into .env.local

# Run migrations
npm run db:push

# Start dev server
npm run dev
```

Open http://localhost:3000.

## Browser Requirements

Web Bluetooth only works in **Chrome** or **Edge** on desktop. Safari is not supported — Mac users should use Chrome for demo.

## Project Structure

```
app/              Next.js app router pages
components/       React components
  dashboard/      Dashboard-specific widgets
  racket/         Racket heatmap + SVG
  connection/     Bluetooth status + controls
lib/
  bluetooth.ts    Web Bluetooth client
  mock.ts         Mock hit generator for dev
  store.ts        Zustand global state
db/
  schema.ts       Drizzle schema
  index.ts        DB client
docs/
  HARDWARE_CONTRACT.md    Data format spec for firmware team
```

## Hardware Integration

See [`docs/HARDWARE_CONTRACT.md`](./docs/HARDWARE_CONTRACT.md) for the exact data format the ESP32 must send.

## Development Notes

- Use **mock mode** (toggle in UI) to test without the ESP32
- All timestamps are stored as UTC; displayed in the user's local timezone
- Coordinates are normalized to `[0, 1]` range across the racket string bed
