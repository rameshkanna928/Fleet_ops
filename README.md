
** Fleet Ops **
# Live Data Dashboard

A real-time dashboard that visualizes data emitted from the current device as it happens. Built with performance in mind — high-frequency updates are handled without flooding the UI with unnecessary re-renders, so the dashboard stays smooth even under a heavy stream of incoming data.

---

## What This App Does

This dashboard listens to a continuous stream of data coming from your device (sensor readings, logs, metrics, or any process that emits data over time) and displays it live. You can:

- Watch data update in real time as it's generated
- Search and filter the incoming records instantly
- Test how fast data is arriving to make sure nothing is being missed or delayed
- Keep the interface responsive even when data is arriving very quickly

---

## Key Features

### 1. Real-Time Data Feed
As soon as the device starts emitting data, it appears on the dashboard — no manual refresh needed. The feed updates continuously in the background.

### 2. Smart Performance Handling (Ref-Based Updates)
Most dashboards re-render the entire UI every time a new piece of data arrives, which can make the page feel laggy when updates come in rapidly.

This app avoids that problem:
- **Sequential/high-frequency values are stored in a `ref`** instead of `state`.
- A `ref` update does **not** trigger a re-render on its own.
- The UI only re-renders when it's actually necessary (for example, when the visible/filtered list changes), not on every single incoming data point.

**In simple terms:** the app "remembers" the newest values instantly in the background, but only redraws the screen when it truly needs to. This keeps the dashboard fast and smooth, even with a rapid stream of data.

### 3. Filters & Search
You can narrow down what you're looking at using:
- **Search by Name** — type a name to instantly find matching records
- **Operator Filter** — filter records by the operator associated with them
- **Status Filter** — filter records by their current status (e.g., All, Idle, Onlline, Ofline etc.)

All filters can be combined to quickly zero in on exactly the data you need.

### 4. Input Speed Test
A built-in tool to measure how quickly data is being received and processed. This helps verify:
- How frequently new data points arrive
- Whether the dashboard is keeping up with the incoming rate
- The overall accuracy and timeliness of the data being displayed

This is useful for spotting delays, dropped updates, or inconsistencies in the data stream before they become a problem.

---

## Why Refs Instead of State for Live Updates?

| Approach | Behavior | Result |
|---|---|---|
| **State** | Every update triggers a re-render | Can slow down the UI when data arrives rapidly |
| **Ref** (used here) | Value updates instantly, no automatic re-render | UI stays fast; re-renders only happen when truly needed |

By storing fast, sequential incoming values in a ref, the app can track every single update accurately without forcing React to redraw the whole page each time. The visible UI is only updated (via state) when there's something the user actually needs to see change — like a filtered result or a summary value.

---

## Getting Started

### Prerequisites
- Node.js installed on your machine
- npm or bun package manager

### Installation
```bash
git clone <your-repository-url>
cd <project-folder>
bun install
```

### Running the App
```bash
bun start
```

The dashboard will open in your browser and automatically begin displaying live data from your device.

---

## How to Use

1. **Start the app** — the dashboard will begin showing incoming data automatically.
2. **Search or filter** — use the search bar to find data by name, or use the dropdown filters to narrow results by operator or status.
3. **Run a speed test** — use the input speed test option to check how accurately and quickly data is being captured.
4. **Monitor live** — leave the dashboard open to continuously track data as it's emitted, without needing to refresh.

---

## Notes for Contributors

- Keep high-frequency, rapidly-changing values in `useRef` rather than `useState` unless the UI genuinely needs to reflect that specific change.
- Only lift a value into `state` when it should cause a visible re-render (e.g., filtered/searched results, summary counts, or status indicators).
- When adding new filters, follow the existing pattern for search/operator/status so behavior stays consistent.

---

## Summary

This project is a performance-conscious live dashboard designed to handle fast-moving, real-time data without sacrificing UI responsiveness. It combines smart React update patterns with practical filtering and a built-in speed test, making it easy to monitor, search, and verify live data from your device.

## Built with
- TypeScript
- React
- Tailwind CSS
