<!-- Auto-generated tech-spec for dumpcap integration -->

# hl7-capture - Technical Specification

**Author:** Glenn
**Date:** 2025-11-08
**Project Level:** 0
**Change Type:** Replace unreliable native capture library with external capture tool
**Development Context:** Integrate dumpcap (Wireshark) for packet capture and forward packets to the existing application for HL7 parsing and session management

---

## Context

### Available Documents

-- Existing project repository and workflows

> Note: Earlier versions used the `cap` native module for live capture. That integration is deprecated
> in favor of the `dumpcap` external capture backend. The references in this file are historical.

### Project Stack

- Electron (desktop app) + React renderer
- Node.js main process (TypeScript)
- `dumpcap` (Wireshark) will be used as an external capture tool

### Existing Codebase Structure

- Main process: `src/main` (capture, app bootstrap)
- Renderer: `src/renderer` (UI components)
- Scripts: `scripts/` (simulators and helpers)

---

<!-- Auto-generated tech-spec (updated) -->

# hl7-capture - Technical Specification

**Author:** Glenn
**Date:** 2025-11-11
**Project Level:** 0
**Change Type:** Replace unreliable native capture library with external capture tool (dumpcap)
**Development Context:** Greenfield (level 0) — integrate `dumpcap` as the external packet capture backend; keep existing HL7 parsing/session logic.

---

## Context

### Available Documents

- `docs/bmm-workflow-status.yaml` — project workflow status and metadata (project_level: 0, field_type: greenfield)
- `docs/` folder contains planning and UX docs (stories, design notes, integration docs). No dedicated product brief or research docs were found for this atomic change.

Summary: Project is greenfield-level-0; tech-spec is tracked in `docs/tech-spec.md` (this file). Existing documentation provides UI stories and integration notes useful for implementation.

### Project Stack (discovered)

- Electron + React renderer (TypeScript)
- Node.js main process (TypeScript)
- Vite for renderer dev server
- Jest for tests

Notes: Package manifest and tooling are standard for an Electron + React TypeScript project. (If you want, I can list exact dependency versions from `package.json`.)

### Existing Codebase Structure

- Greenfield project scaffold present in repo with `src/main`, `src/preload`, `src/renderer`, and supporting scripts in `scripts/`.
- Key areas:
  - `src/main/hl7-capture.ts` — HL7 capture manager (refactor target)
  - `src/main/dumpcap-adapter.ts` — new adapter (to be added)
  - `scripts/mllp-sim.js` — HL7 simulator for integration testing

Existing structure summary: Greenfield project with Electron/React layout; no heavy brownfield constraints.

---

## The Change

### Problem Statement

The native `cap` capture integration has proven unreliable on some platforms (notably Windows). This causes missed or malformed packets and degrades HL7 session reconstruction. We will adopt `dumpcap` (Wireshark) as an external, robust capture backend to provide stable packet delivery.

### Proposed Solution

Invoke `dumpcap` as an external process (spawn) to capture TCP traffic. Stream pcap/pcapng frames from `dumpcap` (stdout) or read rotating pcap files, parse packets to extract IPv4/TCP payloads, and forward payload buffers to the existing `HL7CaptureManager` via an EventEmitter API.

### Scope

In scope:

- Implement `src/main/dumpcap-adapter.ts` to locate and spawn `dumpcap`, stream parse pcap frames, and emit packet events.
- Refactor `src/main/hl7-capture.ts` to accept an external packet source (attach/detach API) without changing HL7 parsing logic.
- Add unit and integration tests for adapter and capture manager integration.
- Document dumpcap/Npcap installation and developer run scripts.
- Persist captured HL7 sessions for a configurable number of days and allow retention to be set in the app UI.
- Run a background cleanup worker that periodically removes sessions older than the configured retention window.
- Run a background submission worker that POSTs captured sessions to a configurable REST API endpoint (separate thread/process) and tracks submission state (pending/submitted/failed).

Out of scope:

- Rewriting HL7 parsing/session algorithms.
- Building or packaging `dumpcap` with the application; user must install Wireshark/dumpcap (documented prerequisites).

---

## Implementation Details

### Source Tree Changes

- Add `src/main/dumpcap-adapter.ts` — adapter to spawn and stream parse dumpcap output.
- Refactor `src/main/hl7-capture.ts` to provide `attachPacketSource(source: EventEmitter)` and `detachPacketSource()`.
- Update `tests/` with unit fixtures (pcap files) and an integration test that validates end-to-end HL7 reconstruction using `scripts/mllp-sim.js` and a pcap fixture.

### Technical Approach

1. `dumpcap-adapter.ts` responsibilities:

- Detect `dumpcap` binary on PATH or common Wireshark install locations (Windows Program Files, etc.).
- Spawn `dumpcap` using Node's `child_process.spawn()` with an explicit argv array (no shell) to avoid injection.
- Support `-w -` (stdout pcap) or temporary file output with rotation.
- Connect stdout to a streaming pcap parser (e.g., `pcap-parser` or `pcapjs`) to decode frames and extract IPv4/TCP payloads.
- Emit `{ sourceIP, destIP, payload }` on `packet` events.

2. `HL7CaptureManager` updates:

- Add `attachPacketSource(source: EventEmitter)` to listen for `packet` events and feed frames into existing parsing/state machine.
- Keep existing session lifecycle and marker handling intact.

3. Security and robustness:

- Validate interface arguments and run dumpcap with minimized privileges where possible.
- Provide clear error handling and recovery for adapter failures (restart policies logged to help troubleshoot capture issues).

### Integration Points

- Adapter emits `packet` events consumed by `HL7CaptureManager`.
- Minor UI toggle (future) to select capture backend (Dumpcap / Cap); default to Dumpcap if available.

---

## Development Context

### Relevant Existing Code

- `src/main/hl7-capture.ts` — capture manager and session handling
- `scripts/mllp-sim.js` — HL7 MLLP simulator (useful for integration tests)

### Dependencies

Framework/Libraries:

- Node.js runtime (Electron main process)
- Add dependency: `pcap-parser` (or similar) for streaming pcap parsing in Node.js

External:

- `dumpcap` (Wireshark) — user-installed runtime dependency

### Configuration Changes

- Document Windows Npcap setup and `dumpcap` installation steps in `README.md` and `docs/`.

### Existing Conventions (Greenfield)

- Follow project TypeScript, linting, and test conventions in the repo; create test files adjacent to source for easy discovery.

### Test Framework & Standards

- Use Jest for unit and integration tests; mock pcap streams for unit tests and use real pcap fixtures for integration tests when possible.

---

## Implementation Stack

- Node's `child_process.spawn` for safe process invocation.
- `pcap-parser` (or well-maintained alternative) to decode pcap/pcapng streams.
- EventEmitter-based integration to keep adapter and capture manager loosely coupled.

---

## Session Persistence & Submission

This project will persist captured HL7 sessions to local storage for a configurable retention period (days). Two background workers will operate independently of the main capture loop:

- Cleanup Worker: runs periodically (configurable interval) and removes sessions whose timestamp is older than the retained-days configuration. Uses `persistedUntil` timestamp on sessions to determine expiry.
- Submission Worker: runs periodically (or event-driven) and POSTs session payloads to a configured REST API endpoint. Submission operates on a separate thread/worker to avoid blocking capture. Each session will track `submissionStatus` (`pending` | `submitted` | `failed`), `submissionAttempts`, and `submittedAt` for auditing and retry logic.

Configuration:

- Retention days (integer) — configurable from UI.
- Submission endpoint URL and optional auth header/token — configurable from UI/settings or environment.
- Submission concurrency and retry policy — number of retries and backoff strategy.

Security/Privacy:

- Submission worker must respect privacy settings and only send data when allowed. If sensitive data must be redacted, the tech-spec will define redaction rules.

Storage:

- Sessions may be persisted as individual JSON files under a `sessions/` folder inside the configured `output_folder`, or in a lightweight embedded store (e.g., LevelDB/SQLite). The design will choose file-backed JSON for simplicity unless scale requires DB.

## Technical Details

1. Recommended dumpcap invocation (PowerShell-safe args):

```powershell
# Capture TCP packets on interface index 1 and write to stdout in pcapng
dumpcap -i 1 -f "tcp" -w -
```

Or use rotating files:

```powershell
dumpcap -i 1 -f "tcp" -b filesize:10240 -w capture.pcapng
```

2. Parsing approach:

- Feed stdout to a streaming pcap parser; for each frame, decode IPv4 and TCP headers to obtain source/destination IPs and TCP payload Buffer.
- Forward payload Buffer to `HL7CaptureManager` which will reconstruct HL7 messages based on markers.

3. Windows privileges:

- Document Npcap installation and the option to allow non-admin capture where appropriate. Provide guidance and a helper script `scripts/setup-npcap.js`.

---

## Development Setup

1. Install Wireshark (or `dumpcap`) and ensure `dumpcap` is on PATH.
2. Optionally install Npcap on Windows with non-admin capture if desired.
3. Run the app and select Dumpcap backend (or default to Dumpcap if detected).

---

## Implementation Guide

### Setup Steps

1. Add `src/main/dumpcap-adapter.ts`.
2. Implement stream parsing of dumpcap stdout and emit `packet` events.
3. Refactor `src/main/hl7-capture.ts` to accept external packet source events.
4. Add unit and integration tests to `tests/`.

### Implementation Steps

1. Implement `dumpcap-adapter.ts` with safe spawn and detection logic.
2. Implement packet parsing using `pcap-parser` and decode IPv4/TCP frames.
3. Expose startup/shutdown APIs for adapter.
4. Wire adapter into `HL7CaptureManager.startCapture()` when method is `dumpcap`.

### Testing Strategy

- Unit test adapter parsing using recorded pcap test fixtures.
- Integration test: Validate that `HL7CaptureManager` reconstructs HL7 messages when adapter feeds packets (use `scripts/mllp-sim.js` or pcap fixtures).

### Acceptance Criteria

- Adapter can be invoked and stream packets into `HL7CaptureManager`.
- HL7 messages from simulator are reconstructed with correct session start/ack/message/end events.

---

## Developer Resources

### File Paths Reference

- `src/main/hl7-capture.ts` — HL7 capture manager (refactor target)
- `src/main/dumpcap-adapter.ts` — adapter (new)
- `scripts/setup-npcap.js` — Windows Npcap setup
- `scripts/mllp-sim.js` — HL7 message simulator

### Key Code Locations

- `HL7CaptureManager` class in `src/main/hl7-capture.ts`

### Testing Locations

- `tests/integration/hl7-capture.integration.test.ts` — update to test adapter integration

### Documentation to Update

- `README.md` — add dumpcap setup and run instructions
- `docs/tech-spec.md` — (this file)

---

## UX/UI Considerations

- Add a small configuration toggle to the capture UI

---

## Deployment Strategy

### Deployment Steps

1. Document prerequisites (Wireshark/dumpcap installation) in README.
2. Ship app update that uses dumpcap adapter by default when dumpcap is available on host.

### Monitoring

- Add logging for adapter startup/shutdown and packet parse errors. Track dropped packets or parse failures.

---

End of updated tech-spec

6. Support protocol marker customization for variants

### 2.3 Scope: IN

- ✅ Network interface detection
- ✅ Configurable capture parameters:
  - Source IP (medical device)
  - Destination IP (LIS system)
  - Start transmission marker (default: 0x05) - customizable
  - Acknowledge marker (default: 0x06) - customizable
  - End transmission marker (default: 0x04) - customizable
- ✅ TCP-only packet capture (filter for TCP traffic)
- ✅ HL7 protocol parsing:
  - Detect device start transmission (0x05)
  - Extract HL7 messages (0x02...CR LF sequences)
  - Track PC acknowledgments (0x06)
  - Identify end transmission (0x04)
- ✅ HL7 session tracking (group related device/PC exchanges)
- ✅ Display sessions in organized view
- ✅ Show individual HL7 messages with:
  - Timestamp
  - Direction (Device → PC or PC → Device)
  - Marker type (start, HL7 message, ack, end)
  - Raw hexadecimal view of payload
  - Decoded HL7 message (if valid)
- ✅ Pause/resume capture
- ✅ Clear captured sessions
- ✅ Single persistent configuration (no presets, one configuration per session)
- ✅ Marker configuration UI (allow custom start/ack/end markers)

### 2.4 Scope: OUT (Future)

- ❌ HL7 message validation against HL7 standards (v2.x)
- ❌ Export to HL7 files, PCAP, JSON, or CSV
- ❌ Traffic statistics or performance graphs
- ❌ Multi-interface simultaneous capture (product will capture on a single interface at a time)
- ❌ Persistent database storage of captures
- ❌ HL7 message editing or modification
- ❌ Integration with actual LIS systems for live testing
- ❌ Network simulation or playback of captures
- ❌ Named configuration presets (single configuration only)
- ❌ Configuration history or versioning

---

## 3. Technical Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  (Node.js runtime - runs on system, full OS access)         │
│                                                             │
│  • Manage app lifecycle                                     │
│  • Initialize window                                        │
│  • Handle IPC from renderer                                 │
│  • Manage packet capture (pcap library)                     │
│  • Keep captured packets in memory                          │
└─────────────────────────────────────────────────────────────┘
                              ↕ (IPC Bridge)
┌─────────────────────────────────────────────────────────────┐
│              Electron Renderer Process (React)              │
│  (Chromium - sandboxed, safe, UI layer)                     │
│                                                             │
│  • React UI components                                      │
│  • User interactions (select interface, start/stop)         │
│  • Display captured packets                                 │
│  • Communicate with main process via IPC                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Key Architecture Decisions

**IPC Communication:**

- Preload script bridges main ↔ renderer (sandboxing best practice)
- Main process owns packet capture & state
- Renderer requests via `window.electron.send()`
- Main responds via `ipcRenderer.on()`

**HL7 Session Storage:**

- In-memory array of HL7 sessions during active capture
- Each session groups related device-to-PC exchanges
- Store up to 100 complete HL7 sessions (configurable)
- Sessions dropped when limit reached (oldest first)
- Cleared when user clicks "Clear"
- Session includes all related TCP packets and parsed messages

**Platform Compatibility:**

- **Windows:** Use npcap library (Wireshark's Windows packet capture)
- **macOS:** Use system libpcap + homebrew
- **Linux:** Use libpcap (usually pre-installed)

---

## 4. Implementation Details

### 4.1 Main Process Architecture (`src/main/index.ts`)

**Responsibilities:**

- Initialize Electron app
- Create browser window
- Set up IPC listeners
- Initialize packet capture with TCP filter
- Parse HL7 protocol sequences
- Manage HL7 session buffer
- Validate configured markers

**Key Functions:**

```typescript
// App initialization
app.on("ready", () => createWindow());

// IPC Handlers
ipcMain.handle("get-interfaces", getNetworkInterfaces);
ipcMain.handle("start-capture", startCapture);
ipcMain.handle("stop-capture", stopCapture);
ipcMain.handle("get-sessions", getSessions);
ipcMain.handle("clear-sessions", clearSessions);
ipcMain.handle("save-marker-config", saveMarkerConfig);

// HL7 parsing
function parseHL7Payload(tcpPayload: Buffer, config: MarkerConfig): HL7Element[];
function trackHL7Session(element: HL7Element): HL7Session;
function validateMarkerConfig(config: MarkerConfig): boolean;
```

**Configuration Interface:**

```typescript
interface MarkerConfig {
  startMarker: number; // Default 0x05
  acknowledgeMarker: number; // Default 0x06
  endMarker: number; // Default 0x04
  sourceIP: string; // Medical device IP
  destinationIP: string; // LIS PC IP
}
```

**HL7 Session Structure (stored in memory):**

```typescript
interface HL7Element {
  id: string;
  timestamp: number;
  direction: "device-to-pc" | "pc-to-device";
  type: "start" | "message" | "ack" | "end";
  hexData: string; // Raw hex representation
  decodedMessage?: string; // Decoded if valid HL7
  rawBytes: Buffer;
}

interface HL7Session {
  id: string;
  sessionId: number; // Numeric session counter
  startTime: number;
  endTime?: number; // Timestamp when session completed
  deviceIP: string;
  lisIP: string;
  elements: HL7Element[];
  messages: string[]; // Decoded HL7 messages only
  isComplete: boolean; // true when 0x04 received
  // Persistence & submission metadata
  persistedUntil?: number; // unix ms timestamp; used by cleanup worker
  submissionStatus?: "pending" | "submitted" | "failed";
  submittedAt?: number; // unix ms timestamp of successful submission
  submissionAttempts?: number; // number of POST attempts
}
```

### 4.2 Renderer Process Architecture (`src/renderer/App.tsx`)

**Main Component Structure:**

```
App
├── Header
│   └── Title + Version
├── ConfigPanel
│   ├── Interface Selector (dropdown)
│   ├── Source IP Input
│   ├── Destination IP Input
│   ├── Marker Configuration (editable)
│   └── Save Configuration Button
├── ControlPanel
│   ├── Start/Stop Button
│   ├── Pause Button
│   └── Clear Button
└── SessionView
    ├── SessionList
    │   ├── Each session timeline
    │   └── Expandable session details
    └── MessageDetail
        ├── Individual message viewer
        ├── Hex display
        └── Decoded HL7 display
```

**Key Components:**

- `InterfaceSelector.tsx` - Dropdown to select network interface
- `ConfigurationPanel.tsx` - IP and marker configuration
- `ControlButtons.tsx` - Start, Stop, Pause, Clear buttons
- `SessionList.tsx` - Display HL7 sessions
- `SessionTimeline.tsx` - Visual timeline of device/PC exchanges
- `MessageViewer.tsx` - Show individual messages with hex and decoded views
- `StatusBar.tsx` - Show capture status, session count, interface name

**State Management:**
Use React hooks (`useState`, `useEffect`, `useReducer`):

```typescript
const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
const [selectedInterface, setSelectedInterface] = useState<string>("");
const [markerConfig, setMarkerConfig] = useState<MarkerConfig>(defaultConfig);
const [isCapturing, setIsCapturing] = useState<boolean>(false);
const [sessions, setSessions] = useState<HL7Session[]>([]);
const [sessionCount, setSessionCount] = useState<number>(0);
const [selectedSession, setSelectedSession] = useState<HL7Session | null>(null);
```

### 4.3 IPC Communication Layer (`src/preload/index.ts`)

**Exposed API (contextBridge):**

```typescript
window.electron = {
  // HL7 capture operations
  getNetworkInterfaces: (): Promise<NetworkInterface[]> => ipcRenderer.invoke("get-interfaces"),

  startCapture: (interface: string, config: MarkerConfig): Promise<void> =>
    ipcRenderer.invoke("start-capture", interface, config),

  stopCapture: (): Promise<void> => ipcRenderer.invoke("stop-capture"),

  getSessions: (): Promise<HL7Session[]> => ipcRenderer.invoke("get-sessions"),

  clearSessions: (): Promise<void> => ipcRenderer.invoke("clear-sessions"),

  saveMarkerConfig: (config: MarkerConfig): Promise<void> =>
    ipcRenderer.invoke("save-marker-config", config),

  validateMarkerConfig: (config: MarkerConfig): Promise<boolean> =>
    ipcRenderer.invoke("validate-marker-config", config),

  // Event listeners
  onNewElement: (callback: (element: HL7Element) => void) =>
    ipcRenderer.on("hl7-element-received", callback),

  onSessionComplete: (callback: (session: HL7Session) => void) =>
    ipcRenderer.on("session-complete", callback),

  onCaptureStatus: (callback: (status: CaptureStatus) => void) =>
    ipcRenderer.on("capture-status", callback),

  onError: (callback: (error: string) => void) => ipcRenderer.on("capture-error", callback),
};
```

### 4.4 HL7 Protocol Parsing

**Dependencies:**

- Use `node-pcap` library to capture raw TCP packets
- Use `pcap` module's built-in packet parser
- Manual TCP payload extraction and HL7 marker detection

**HL7 Parsing Logic:**

1. Receive raw TCP packet from pcap (filtered for configured IPs/ports)
2. Parse TCP segment to extract payload
3. Scan payload for HL7 marker bytes:
   - 0x05: Device start transmission
   - 0x06: PC acknowledgment
   - 0x02...CR LF: HL7 message sequence
   - 0x04: Device end transmission
4. Create HL7Element for each marker/message found
5. Group elements into HL7Session (from 0x05 to 0x04)
6. Store session in buffer
7. Emit elements and completed sessions to renderer via IPC

**Marker Customization:**

- Allow user to specify custom marker bytes via configuration
- Default: 0x05 (start), 0x06 (ack), 0x04 (end)
- Validate marker bytes are unique and single-byte values
- Support protocols with different marker conventions

---

## 5. Source Tree Changes

### 5.1 New Files to Create

**Electron Configuration:**

- `forge.config.ts` - Electron Forge build configuration
- `vite.config.ts` - Vite build configuration for React

**Source Code:**

- `src/main/index.ts` - Main process entry point (packet capture logic)
- `src/preload/index.ts` - Preload script (IPC bridge)
- `src/renderer/index.tsx` - React entry point
- `src/renderer/App.tsx` - Main App component
- `src/renderer/components/ControlPanel.tsx` - Control buttons
- `src/renderer/components/InterfaceSelector.tsx` - Interface dropdown
- `src/renderer/components/PacketTable.tsx` - Packet display table
- `src/renderer/components/StatusBar.tsx` - Status display
- `src/common/types.ts` - Shared TypeScript types
- `src/common/constants.ts` - Shared constants
- `src/renderer/utils/formatters.ts` - IP/timestamp formatters

**Configuration & Build:**

- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts (will add entries)
- `public/index.html` - HTML template
- `.env.example` - Environment variable template

**Documentation:**

- `README.md` - Project overview, installation, usage
- `docs/DEVELOPMENT.md` - Developer setup guide
- `docs/ARCHITECTURE.md` - Architecture deep-dive

**Testing:**

- `tests/unit/packetParser.test.ts` - Unit tests for parsing
- `tests/integration/capture.test.ts` - Integration tests
- `jest.config.js` - Jest configuration
- `tests/__mocks__/pcap.ts` - Mock pcap library

---

## 6. Technical Approach

### 6.1 Packet Capture Strategy

**Library Choice: node-pcap**

```bash
npm install pcap
npm install -D @types/pcap
```

Reason: Actively maintained, supports cross-platform capture, good Node.js community support

**Installation Requirements by OS:**

**Windows:**

- User must install **npcap** from https://npcap.org/download
- Installer can provide download link in app

**macOS:**

- System libpcap included
- Can use Homebrew: `brew install libpcap` (optional, usually pre-installed)

**Linux:**

- Install libpcap: `sudo apt-get install libpcap-dev` (Debian/Ubuntu)

### 6.2 Capture Implementation Flow

```typescript
// 1. Initialize pcap session with TCP filter for configured IPs
const bpfFilter = `tcp and (src ${deviceIP} and dst ${pcIP}) or (src ${pcIP} and dst ${deviceIP})`;
const session = pcap.createSession("eth0", {
  bufferSize: 0,
  filter: bpfFilter, // Capture only TCP between device and PC
  snaplen: 65535,
});

// 2. Set up packet handler with HL7 parsing
session.on("packet", (rawPacket) => {
  const tcpPayload = extractTCPPayload(rawPacket);
  const hl7Elements = parseHL7Payload(tcpPayload, markerConfig);

  hl7Elements.forEach((element) => {
    addToSessionBuffer(element);
    notifyRenderer(element); // Send via IPC

    if (element.type === "end") {
      completeSession(); // Finalize session when 0x04 received
      notifyRenderer(session); // Send completed session
    }
  });
});

// 3. Start capture
session.resume();

// 4. Stop capture
session.close();
```

### 6.3 UI/UX Patterns

**Application Flow:**

1. User launches app
2. App displays configuration panel with interface selector
3. User:
   - Selects network interface
   - Enters source IP (medical device)
   - Enters destination IP (LIS PC)
   - Reviews/modifies marker configuration (0x05, 0x06, 0x04)
4. User clicks "Save Configuration" and "Start Capture"
5. App begins capturing TCP traffic between configured IPs
6. HL7 sessions stream into session view in real-time
7. Each session shows:
   - Timeline of device→PC→device exchanges
   - Markers (start, ack, end)
   - Individual HL7 messages
8. User can click session to expand and view message details
9. Message detail view shows:
   - Hex representation
   - Decoded HL7 message (if valid)
   - Timestamp and direction
10. User can pause/resume capture without losing data
11. User can clear all sessions
12. Session count displayed in status bar

**UI States:**

- **Idle:** Config editable, Start button active, Stop disabled
- **Capturing:** Config disabled, Start disabled, Stop/Pause active
- **Paused:** Config disabled, all buttons active, show pause indicator
- **Session Selected:** Message detail panel visible with hex/decoded views

---

## 7. Existing Patterns & Conventions

### 7.1 Code Organization

```
Per-file pattern:
- Imports (external → internal → relative)
- Type definitions
- Constants
- Main function/component
- Helper functions
- Exports
```

### 7.2 Component Patterns (React)

```typescript
// Functional components with hooks
export const PacketTable: React.FC<Props> = ({ packets }) => {
  const [sortKey, setSortKey] = useState<string>('timestamp')

  return <div className="packet-table">{/* JSX */}</div>
}
```

### 7.3 Error Handling

```typescript
try {
  const packets = await ipcRenderer.invoke("start-capture", interfaceName);
} catch (error) {
  console.error("Capture failed:", error);
  showUserNotification("Failed to start capture. Check permissions.");
}
```

### 7.4 Logging

```typescript
// Development
console.debug("Packet parsed:", { sourceIP, destIP });

// Important events
console.log("Capture started on interface:", interfaceName);

// Errors
console.error("Permission denied for interface:", error.message);
```

---

## 8. Integration Points

### 8.1 Internal Dependencies

- All modules use shared types from `src/common/types.ts`
- IPC communication via preload bridge
- Renderer → Main via `window.electron.{method}()`

### 8.2 External Dependencies

- **pcap library** ↔ Raw packet capture
- **Electron** ↔ OS window management
- **React** ↔ UI rendering
- **Vite** ↔ Build tooling

### 8.3 System Integration

- **OS Network APIs** (via pcap library)
- **System Libraries:**
  - libpcap (macOS/Linux)
  - npcap (Windows - user-installed)

---

## 9. Existing Code References

**No existing code** - This is a greenfield project. All patterns are newly established with this change.

---

## 10. Framework & Library Versions

**Definitive Stack:**

```json
{
  "dependencies": {
    "electron-squirrel-startup": "^1.1.1",
    "pcap": "^3.1.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@electron-forge/cli": "^6.2.1",
    "@electron-forge/maker-deb": "^6.2.1",
    "@electron-forge/maker-rpm": "^6.2.1",
    "@electron-forge/maker-squirrel": "^6.2.1",
    "@electron-forge/maker-zip": "^6.2.1",
    "@electron-forge/plugin-vite": "^6.2.1",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron": "^27.0.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "eslint": "^8.53.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 11. Configuration & Environment

### 11.1 Electron Configuration (`forge.config.ts`)

```typescript
const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: "hl7-capture",
    icon: "./public/icon",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}), // Windows
    new MakerZIP({}), // macOS
    new MakerDeb({}), // Linux DEB
    new MakerRPM({}), // Linux RPM
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: "src/main/index.ts", config: "vite.config.ts" },
        { entry: "src/preload/index.ts", config: "vite.config.ts" },
        { entry: "src/renderer/index.tsx", config: "vite.config.ts" },
      ],
    }),
  ],
};
```

### 11.2 TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  }
}
```

### 11.3 Environment Variables (`.env.example`)

```
# Capture Configuration
PACKET_BUFFER_SIZE=1000
DEBUG=hl7-capture:*
```

---

## 12. Development Setup

### 12.1 Prerequisites

- **Node.js 20.10.0 or later** - Runtime
- **npm 10.2.0 or later** - Package manager
- **git** - Version control
- **Platform-specific:**
  - **Windows:** npcap library (user installs from https://npcap.org)
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Linux:** build-essential, libpcap-dev (`sudo apt-get install libpcap-dev`)

### 12.2 Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/hl7-capture.git
cd hl7-capture

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Start development server with hot reload
npm run dev

# 5. Run tests
npm test
```

### 12.3 Development Scripts

From `package.json`:

```json
{
  "scripts": {
    "start": "electron-forge start",
    "dev": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write 'src/**/*.{ts,tsx}'",
    "type-check": "tsc --noEmit"
  }
}
```

### 12.4 Running Locally

```bash
# Development (with hot reload)
npm run dev

# Package for distribution
npm run package

# Create installers
npm run make
```

---

## 13. Implementation Guide

### 13.1 Setup & Preparation

**Pre-Implementation Checklist:**

- [ ] Repository created and initialized
- [ ] package.json scaffolded with dependencies
- [ ] TypeScript, ESLint, Prettier configured
- [ ] Development environment tested (Node.js, npm work)
- [ ] Git workflow established (branches, commits)

**Key Setup Steps:**

1. Create project directory
2. Initialize with `npm init`
3. Install Electron + dependencies
4. Set up TypeScript config
5. Create basic Electron structure
6. Verify Electron window launches

### 13.2 Implementation Steps (In Order)

**Phase 1: Foundation (Main Process)**

1. Create `src/main/index.ts` - Electron app initialization
2. Create window and app lifecycle handlers
3. Set up IPC listener structure (empty handlers)
4. Test: Electron window launches

**Phase 2: HL7 Protocol & Capture Logic**

5. Create `src/common/types.ts` - Define HL7 TypeScript interfaces (MarkerConfig, HL7Element, HL7Session)
6. Install & verify pcap library
7. Implement network interface detection (`getNetworkInterfaces()`)
8. Implement marker configuration validation (`validateMarkerConfig()`)
9. Implement TCP packet capture with IP/port filtering (`startCapture()`, `stopCapture()`)
10. Implement HL7 payload parsing:
    - Extract TCP payload from raw packet
    - Scan for marker bytes (0x05, 0x06, 0x04)
    - Extract HL7 messages (0x02...CR LF)
    - Create HL7Element objects
11. Implement HL7 session tracking:
    - Group elements from 0x05 to 0x04
    - Complete session when end marker received
    - Store in session buffer (max 100 sessions)
12. Test: Manually verify TCP capture works, HL7 parsing correct with sample medical device data

**Phase 3: IPC Bridge**

13. Create `src/preload/index.ts` - IPC bridge with contextBridge
14. Expose window.electron API with all HL7-specific methods
15. Test: Console verify window.electron exists in DevTools

**Phase 4: React UI - Configuration Panel (Renderer)**

16. Create React entry point (`src/renderer/index.tsx`)
17. Create `src/renderer/App.tsx` - Main app component with tabs/sections
18. Create `ConfigurationPanel.tsx`:
    - Interface selector (dropdown)
    - Source IP input (medical device)
    - Destination IP input (LIS PC)
    - Marker configuration inputs (hex byte inputs for 0x05, 0x06, 0x04)
    - Save/Reset configuration buttons
19. Add configuration validation and feedback
20. Test: Configuration UI renders, inputs accept values

**Phase 5: React UI - Capture Controls**

21. Create `ControlPanel.tsx` - Start, Stop, Pause, Clear buttons
22. Wire up state management (useState, useEffect)
23. Connect IPC calls to UI buttons
24. Implement button state logic (disable when inappropriate)
25. Test: Buttons clickable, states change correctly

**Phase 6: React UI - Session Display**

26. Create `SessionList.tsx` - Display HL7 sessions
27. Create `SessionTimeline.tsx` - Visual timeline of device/PC exchanges
28. Create `MessageViewer.tsx` - Individual message detail viewer with:
    - Hex representation
    - Decoded HL7 message
    - Direction and timestamp
29. Wire up session selection and detail display
30. Test: Sessions display, expandable, messages viewable

**Phase 7: Real-Time Updates**

31. Implement `onNewElement` IPC listener in renderer
32. Update session list in real-time as elements arrive
33. Update session timeline as elements arrive
34. Implement `onSessionComplete` listener
35. Update session count in status bar
36. Test: Sessions stream in real-time during capture

**Phase 8: Configuration & Build**

37. Create `forge.config.ts` - Electron Forge config
38. Create `vite.config.ts` - Vite build config
39. Configure build output and makers
40. Test: `npm run dev` launches dev environment

**Phase 9: Testing**

41. Create unit tests for HL7 marker detection
42. Create unit tests for HL7 message parsing
43. Create integration tests for full capture flow
44. Create integration tests for marker customization
45. Configure Jest
46. Achieve 80%+ coverage on core logic
47. Test: `npm test` runs suite successfully

**Phase 10: Documentation**

48. Create README.md with HL7 protocol overview, installation, usage
49. Create docs/DEVELOPMENT.md with dev setup
50. Create docs/HL7-PROTOCOL.md - HL7 marker specification details
51. Add inline code comments for complex HL7 parsing logic

### 13.3 Testing Strategy

**Unit Tests:**

- Test HL7 marker detection: Verify 0x05, 0x06, 0x04 recognition
- Test HL7 message parsing: Verify 0x02...CR LF extraction
- Test marker configuration validation: Custom marker support
- Test interface detection: Mock os.networkInterfaces()
- Test buffer management: Add/clear operations, max 100 sessions

**Integration Tests:**

- Test full capture flow: Configure → Start → receive TCP → parse HL7 → update session
- Test marker customization: Change markers, verify parsing with custom markers
- Test session tracking: 0x05 to 0x04 grouping
- Test IPC communication: Renderer → Main → HL7Element emission
- Test UI state updates: Config save → enable buttons → capture starts

**Manual Testing Checklist:**

- [ ] Configure source/dest IPs correctly
- [ ] Start capture on actual medical device-to-LIS communication
- [ ] Verify sessions capture entire device transmission (0x05 to 0x04)
- [ ] Verify individual HL7 messages (0x02...CR LF) parsed correctly
- [ ] Verify PC acknowledgments (0x06) shown for each message
- [ ] Pause capture, verify HL7 elements stop arriving
- [ ] Resume capture, verify elements resume
- [ ] Click "Clear", verify all sessions cleared
- [ ] Stop capture cleanly without errors
- [ ] Marker customization: Change markers, re-capture, verify new markers detected
- [ ] Multiple active sessions: Verify independent tracking
- [ ] App runs on Windows/Mac/Linux

**Performance Testing:**

---

## 14. Acceptance Criteria

Specific, measurable criteria for "done":

1. **Interface Detection (AC #1)**
   - Given: App launches
   - When: User clicks interface dropdown
   - Then: All network interfaces listed with names and IP addresses
   - Verified: Drop-down shows ≥2 interfaces (or all available interfaces)

2. **Capture Start (AC #2)**
   - Given: Interface selected
   - When: User clicks "Start Capture"
   - Then: App begins capturing packets on selected interface
   - Verified: Packet count increases, packets visible in table

3. **Packet Display (AC #3)**
   - Given: Capture active
   - When: Packets arrive on network
   - Then: Each packet displayed in table with: timestamp, source IP, dest IP, protocol, size
   - Verified: Table columns show correct data, matches actual network traffic

4. **Pause/Resume (AC #4)**
   - Given: Capture active
   - When: User clicks "Pause"
   - Then: Packet capture pauses, table freezes, packet count stable
   - When: User clicks "Resume"
   - Then: Capture resumes, new packets arrive
   - Verified: No packets lost, seamless transition

5. **Clear Packets (AC #5)**
   - Given: Packets in table
   - When: User clicks "Clear"
   - Then: Table becomes empty, count resets to 0
   - Verified: All packets removed, UI updated

6. **Stop Capture (AC #6)**
   - Given: Capture active
   - When: User clicks "Stop"
   - Then: Capture ends cleanly, interface selector re-enabled
   - Verified: No errors, app stable

7. **UI Responsiveness (AC #7)**
   - Given: Heavy network traffic (100+ packets/sec)
   - When: Capture active
   - Then: UI remains responsive, buttons clickable
   - Verified: No UI freezing or lag

8. **Cross-Platform (AC #8)**
   - Given: macOS/Windows/Linux
   - When: App launches and captures on each OS
   - Then: Works identically on all platforms
   - Verified: Tested on Windows, macOS, Linux

---

## 15. Developer Resources

### 15.1 Complete File Path Reference

**Configuration & Entry Points:**

- `/forge.config.ts` - Electron Forge build config
- `/vite.config.ts` - Vite build config
- `/tsconfig.json` - TypeScript config
- `/package.json` - Dependencies and scripts
- `/.env.example` - Environment template

## 16. Configuration Panel — Detailed UI Specification

Goal: Replace the current placeholder with a fully-specified Configuration Panel that lets users pick a network interface, specify capture filters (source/destination IPs), configure HL7 protocol markers, save/load named configurations, and validate inputs prior to starting capture.

16.1 Layout and High-Level Behavior

- Location: Primary app view, left-hand pane of the main window (ConfigPanel region in `App`).
- Sections (top → bottom):
  1. Interface Selector (dropdown + refresh)
  2. Capture Targets
     - Source IP (medical device)
     - Destination IP (LIS/PC)
  3. Marker Configuration
     - Start marker (hex byte) - default 0x05
     - Acknowledge marker (hex byte) - default 0x06
     - End marker (hex byte) - default 0x04
  4. Advanced Options (collapsible)
     - Snaplen (packet length limit)
     - BPF filter override (free-form, optional)
     - Session buffer size (default 100)
  5. Validation feedback and Save Configuration button

     16.2 Controls & Interactions

- Interface Selector
  - Reads options from `window.electron.getNetworkInterfaces()` and shows each interface name + primary IPv4 address (or label "no-ip" when none).
  - Has a Refresh button to re-query interfaces.
  - Selecting an interface updates `selectedInterface` state and triggers a small sample-check (non-blocking) to ensure permissions are adequate.

- Capture Targets
  - Source IP and Destination IP are free-text inputs with IP address validation (IPv4 required for V1). Inputs suggest auto-complete based on detected addresses for convenience.
  - If left empty, capture will default to the selected interface without IP filtering (warning shown).

- Marker Configuration
  - Each marker input accepts 1-2 hex characters (examples: `05`, `0x05`, or `5` accepted but normalized to `0x05`).
  - Validate uniqueness: start, ack and end must be distinct single-byte values.
  - Show inline validation errors and brief examples of common HL7 marker bytes.

- Advanced Options
  - Snaplen: numeric input (min 256, max 65535), default 65535.
  - BPF override: a single-line text input that, when provided, takes precedence over generated BPF filter. Show a warning: "Custom BPF overrides generated filters — use carefully." Validate basic characters to avoid injection.
  - Session buffer size: numeric input (min 10, max 5000), default 100.

- Primary Actions
  - Save Configuration (persists preset and applies it to in-memory `markerConfig`)
  - Start Capture (disabled until validation passes)
  - Reset to Defaults

    16.3 Accessibility & Keyboard

- All controls must be keyboard accessible and labeled for screen readers.
- Provide clear focus order: Interface → Source IP → Destination IP → Markers → Advanced → Actions.

  16.4 Visual/UX Notes

- Use tight vertical layout for quick scanning. Validation messages in light red; success inline checks in green.
- Tooltips for advanced options explaining risks (e.g., custom BPF may capture unrelated traffic).

  16.5 Component Contracts (props / events)

- InterfaceSelector props:
  - interfaces: NetworkInterface[]
  - value: string | null
  - onChange(interfaceName: string): void
  - onRefresh(): Promise<void>

- MarkerConfigForm props:
  - value: MarkerConfig
  - onChange(cfg: MarkerConfig): void
  - validate(): ValidationResult

- ConfigPanel props:
  - initialConfig?: MarkerConfig
  - onApply(cfg: MarkerConfig): void
  - onStartCapture(): void

    16.6 IPC Mapping

- `getNetworkInterfaces()` → populates InterfaceSelector on mount and on Refresh.
- `validateMarkerConfig` → used for client-side validation before enabling Start.
- `saveMarkerConfig(config)` → persists a named preset and returns success/failure.

## 17. User Stories (Configuration + Capture)

As an engineer troubleshooting HL7 devices, I want to quickly select the interface and capture only device↔PC traffic so I can focus on HL7 messages.

17.1 Stories (priority order)

1. Story: Interface Selection (P0)
   - As a user, I can choose which network interface the app uses to capture packets.
   - Acceptance:
     - Interface list shows human-friendly name and IPv4 address (if available).
     - Refresh updates list.
     - Selecting an interface sets the selection in state.

2. Story: Simple Capture Config (P0)
   - As a user, I can enter source and destination IPs and start a capture that filters to those IPs.
   - Acceptance:
     - Inputs validate IPv4 format.
     - Start Capture is disabled until validation passes or user confirms a no-IP-capture warning.

3. Story: Marker Customization (P0)
   - As a user, I can change start/ack/end markers and save them as part of a preset.
   - Acceptance:
     - Marker inputs accept hex and normalize to `0xNN`.
     - Validation prevents duplicate markers.

4. Story: Named Presets (P1)
   - As a user, I can save/load/delete named capture configurations.
   - Acceptance:
     - Presets list persists across restarts (stored under `docs/config-presets/`).

5. Story: Advanced Override (P2)
   - As an advanced user, I can provide a custom BPF string that overrides generated filters.
   - Acceptance:
     - App warns that BPF overrides the generated filter.
     - BPF string is passed to the capture session when starting.

6. Story: Quick Validation & Start (P0)
   - As a user, I can validate the configuration quickly and start capture; validation errors are shown inline.

## 18. Implementation Tasks (Config Panel)

Breakdown with estimated complexity (S/M/L):

1. Create `src/renderer/components/InterfaceSelector.tsx` (S)
   - Query `getNetworkInterfaces()` on mount, render list, implement Refresh button.

2. Create `src/renderer/components/MarkerConfigForm.tsx` (S)
   - Inputs for start/ack/end markers with normalization/validation functions.

3. Update `src/renderer/components/ConfigurationPanel.tsx` (M)
   - Compose InterfaceSelector + inputs + advanced options + presets UI.
   - Wire up `onApply` and `onStartCapture` actions to IPC.

4. Presets persistence helpers (M)
   - Implement helper in `src/renderer/utils/presets.ts` for read/write JSON files via IPC to main process (main implements file access safely; renderer requests via `ipc.invoke('presets:save', preset)`).

5. Main process handlers (M):
   - `ipcMain.handle('presets:save', ...)` and `presets:list`, `presets:delete` that store presets in `path.join(output_folder, 'config-presets')`.

6. Connect validation flow (S):
   - Use `validateMarkerConfig` IPC method for format checks; also run local checks for UI responsiveness.

7. Unit tests (M):
   - `tests/unit/markerConfig.test.ts` validate normalization and duplicate detection.
   - `tests/unit/interfaceSelector.test.tsx` component renders given mock interfaces.

8. Integration test (M):
   - `tests/integration/configPanel.integration.test.tsx` - simulate user filling config and starting capture (mock main IPC handlers).

9. E2E / Manual checklist (S):
   - Verify presets persist across app restarts; start capture with/without IPs; BPF override respected.

## 19. Acceptance Criteria — Configuration Panel (detailed)

AC-C1: Interface selector lists detected network interfaces and updates on Refresh. (See Story 1 acceptance)

AC-C2: Marker inputs normalize and validate hex bytes; duplicate detection prevents saving. (See Story 3 acceptance)

AC-C3: Named presets persist across restarts and can be applied quickly. (See Story 4 acceptance)

AC-C4: Start Capture is disabled when validation fails; user can override with an explicit confirmation modal to start an unfiltered capture.

AC-C5: Custom BPF when provided is used verbatim as the capture filter; the app shows a warning about overrides.

AC-C6: All new components have unit tests with coverage ≥ 80% for core logic (normalization, validation).

## 20. Tests & QA Notes

- Unit tests:
  - Marker normalization; accepts `05`, `0x05`, `5` → returns `0x05`.
  - Duplicate detection rejects same byte values.
  - InterfaceSelector renders IPv4 addresses and reacts to refresh.

- Integration tests:
  - ConfigPanel integration using mocked IPC: ensure `startCapture` invoked with expected config object.

- Manual tests:
  - Install npcap on Windows, start app, select interface, enter IPs and markers, Start Capture, verify packets appear.

## 21. Backwards Compatibility & Migration

- Existing placeholder `ConfigurationPanel` component should be replaced or extended; maintain the `ConfigPanel` prop contract used by `App` to avoid refactoring `App.tsx`.

## 22. Next Steps (after implementing UI)

1. Wire the real capture pipeline end-to-end with the UI: ensure `startCapture` receives correct BPF/snapshot/snapshot options.
2. Implement presets file watcher so external edits to `docs/config-presets/*.json` appear in the app without restart (optional).
3. Add telemetry hooks for capture errors (ensure privacy; only send anonymized metrics if enabled).

**Main Process:**

- `/src/main/index.ts` - Electron app + packet capture logic
