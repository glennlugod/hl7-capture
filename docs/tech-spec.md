# Technical Specification: HL7-Capture - Network Traffic Capture Desktop Application

**Project:** hl7-capture  
**Level:** 0 (Atomic Change)  
**Type:** Greenfield  
**Date Generated:** 2025-11-04  
**Author:** Glenn

---

## 1. Context & Project Setup

### 1.1 Project Overview

hl7-capture is a new greenfield project starting from scratch. This technical specification defines the first atomic change: building an Electron-based desktop application that captures network traffic on a specified interface and displays captured packets with basic visualization.

### 1.2 Available Documentation

- **Product Brief:** None yet (optional for Level 0)
- **Research Documents:** None yet (optional for Level 0)
- **Brownfield Analysis:** N/A - Greenfield project
- **Existing Codebase:** None - Starting fresh

### 1.3 Technology Stack

This specification establishes the foundational tech stack for hl7-capture:

**Runtime & Platform:**

- **Node.js:** 20.10.0 LTS (recommended for Electron + network operations)
- **OS Compatibility:** Windows, macOS, Linux (Electron cross-platform support)
- **Architecture:** 64-bit (standard Electron requirement)

**Core Frameworks & Libraries:**

- **Electron:** 27.0.0 - Desktop application framework
- **Electron Forge:** 6.2.1 - Build, package, and publish Electron apps
- **TypeScript:** 5.3.3 - Type-safe development
- **React:** 18.2.0 - UI framework (recommended for Electron apps)
- **Vite:** 5.0.0 - Fast build tool and dev server for React

**Network Capture:**

- **pcap.js:** 1.0.1+ OR **node-pcap:** 1.1.0+ - Raw packet capture (Linux/macOS)
- **WinPcap** / **npcap:** 1.x (Windows driver, installed separately by user)
- **libpcap (Linux):** Version 1.10.0+ (system library)

**UI & Visualization:**

- **electron-react-devtools:** 1.1.1 - Development tools
- **date-fns:** 3.0.0+ - Date/time formatting for packet timestamps
- **recharts:** 2.10.0+ OR **visx:** 3.10.0+ - Optional charting (for traffic graphs)

**Development & Testing:**

- **Jest:** 29.7.0 - Unit testing
- **@testing-library/react:** 14.1.0 - React component testing
- **ESLint:** 8.53.0 - Code linting
- **Prettier:** 3.1.0 - Code formatting

**Build & Deployment:**

- **npm:** 10.2.0+ (comes with Node.js 20.10)

### 1.4 Established Conventions (Greenfield)

Since this is a greenfield project, we establish these conventions for consistency:

**Code Style:**

- Language: TypeScript (strict mode enabled)
- Indentation: 2 spaces
- Quotes: Double quotes
- Semicolons: Enabled
- Line length: 100 characters (soft limit, 120 hard limit)
- Import organization: External → Internal → Relative
- Arrow functions preferred over `function` keyword

**File Organization:**

```
hl7-capture/
├── src/
│   ├── main/                 # Electron main process
│   │   └── index.ts
│   ├── preload/              # Preload scripts (IPC bridge)
│   │   └── index.ts
│   ├── renderer/             # React frontend
│   │   ├── App.tsx
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # API/service layer
│   │   ├── utils/            # Utilities and helpers
│   │   ├── types/            # TypeScript type definitions
│   │   └── index.tsx         # React entry point
│   ├── common/               # Shared code (main + renderer)
│   │   ├── types.ts          # Shared TypeScript types
│   │   └── constants.ts      # Shared constants
│   └── native/               # Native bindings (if needed)
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── __mocks__/            # Test mocks
├── public/                   # Static assets
├── forge.config.ts           # Electron Forge config
├── vite.config.ts            # Vite config
├── tsconfig.json             # TypeScript config
├── package.json
├── README.md
└── docs/
    └── DEVELOPMENT.md        # Setup and contribution guide
```

**Test Patterns:**

- Test files: `*.test.ts` or `*.spec.ts` placed alongside source
- Test organization: Tests mirror src structure
- Mocking: Jest mock functions and manual mocks in `__mocks__` folder
- Assertion style: expect() - BDD style
- Coverage target: 80%+ for business logic

**Error Handling:**

- Use Error subclasses for specific errors
- Log errors with context
- User-facing errors: Clear, non-technical messages
- System errors: Full stack traces in development, sanitized in production

**Logging:**

- Use `console.log()` for development (development: debug level, production: info level)
- Consider winston or pino if multiple log levels needed
- Log structure: timestamp, level, message, context

---

## 2. The Change: Network Traffic Capture Feature

### 2.1 Problem Statement

Developers and network engineers need to capture and analyze network traffic on their systems. Currently, they must use separate command-line tools (tcpdump, Wireshark) that can be complex. A native desktop application providing simple traffic capture with basic visualization would improve usability.

### 2.2 Solution Overview

Build **hl7-capture**: An Electron desktop application that:

1. Detects available network interfaces on the user's machine
2. Allows the user to select an interface and start packet capture
3. Captures raw network packets in real-time
4. Displays captured packets in a table with basic information (source, destination, protocol, size, timestamp)
5. Provides ability to stop/pause capture
6. Clears or archives captured packets

### 2.3 Scope: IN

- ✅ Network interface detection (using system APIs or pcap library)
- ✅ Start/stop capture on selected interface
- ✅ Real-time packet capture using pcap
- ✅ Electron window with React UI
- ✅ Display captured packets in a table/list format
- ✅ Show packet metadata: source IP, destination IP, protocol, size, timestamp
- ✅ Pause/resume capture
- ✅ Clear packet list (in-memory only, no persistence)

### 2.4 Scope: OUT (Future)

- ❌ Packet filtering or search
- ❌ Packet detail inspection (deep protocol analysis)
- ❌ Export to PCAP, JSON, or CSV
- ❌ Packet statistics or graphs
- ❌ Protocol dissection (TCP/UDP payload analysis)
- ❌ Multi-interface simultaneous capture
- ❌ Persistent storage of captures
- ❌ Advanced visualization

---

## 3. Technical Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  (Node.js runtime - runs on system, full OS access)          │
│                                                               │
│  • Manage app lifecycle                                       │
│  • Initialize window                                          │
│  • Handle IPC from renderer                                   │
│  • Manage packet capture (pcap library)                       │
│  • Keep captured packets in memory                            │
└─────────────────────────────────────────────────────────────┘
                              ↕ (IPC Bridge)
┌─────────────────────────────────────────────────────────────┐
│              Electron Renderer Process (React)               │
│  (Chromium - sandboxed, safe, UI layer)                       │
│                                                               │
│  • React UI components                                        │
│  • User interactions (select interface, start/stop)           │
│  • Display captured packets                                   │
│  • Communicate with main process via IPC                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Key Architecture Decisions

**IPC Communication:**

- Preload script bridges main ↔ renderer (sandboxing best practice)
- Main process owns packet capture & state
- Renderer requests via `window.electron.send()`
- Main responds via `ipcRenderer.on()`

**Packet Storage:**

- In-memory array during active capture
- Store up to 1,000 packets in memory (configurable)
- Oldest packets dropped when limit reached
- Cleared when user clicks "Clear"

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
- Initialize packet capture
- Manage packet buffer

**Key Functions:**

```typescript
// App initialization
app.on('ready', () => createWindow())

// IPC Handlers
ipcMain.handle('get-interfaces', getNetworkInterfaces)
ipcMain.handle('start-capture', startCapture)
ipcMain.handle('stop-capture', stopCapture)
ipcMain.handle('get-packets', getPackets)
ipcMain.handle('clear-packets', clearPackets)

// Packet handling
function handlePacket(packet: Buffer, interface: string)
function getNetworkInterfaces(): Promise<NetworkInterface[]>
```

**Packet Structure (stored in memory):**

```typescript
interface CapturedPacket {
  id: string // Unique ID
  timestamp: number // Unix timestamp (ms)
  sourceIP: string // Source IP address
  destinationIP: string // Destination IP address
  protocol: string // 'TCP' | 'UDP' | 'ICMP' | 'Other'
  sourcePort?: number // Source port (if applicable)
  destinationPort?: number // Destination port (if applicable)
  length: number // Packet size in bytes
  rawData: Buffer // Full packet binary data
}
```

### 4.2 Renderer Process Architecture (`src/renderer/App.tsx`)

**Main Component Structure:**

```
App
├── Header
│   └── Title + Version
├── ControlPanel
│   ├── Interface Selector (dropdown)
│   ├── Start/Stop Button
│   ├── Pause Button
│   └── Clear Button
└── PacketTable
    ├── Column: Timestamp
    ├── Column: Source IP:Port
    ├── Column: Destination IP:Port
    ├── Column: Protocol
    ├── Column: Size (bytes)
    └── Pagination / Infinite scroll
```

**Key Components:**

- `InterfaceSelector.tsx` - Dropdown to select network interface
- `ControlButtons.tsx` - Start, Stop, Pause, Clear buttons
- `PacketTable.tsx` - Display packets in table format
- `StatusBar.tsx` - Show capture status, packet count, interface name

**State Management:**
Use React hooks (`useState`, `useEffect`, `useReducer`):

```typescript
const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
const [selectedInterface, setSelectedInterface] = useState<string>('')
const [isCapturing, setIsCapturing] = useState<boolean>(false)
const [packets, setPackets] = useState<CapturedPacket[]>([])
const [packetCount, setPacketCount] = useState<number>(0)
```

### 4.3 IPC Communication Layer (`src/preload/index.ts`)

**Exposed API (contextBridge):**

```typescript
window.electron = {
  // Packet capture operations
  getNetworkInterfaces: (): Promise<NetworkInterface[]> =>
    ipcRenderer.invoke('get-interfaces'),

  startCapture: (interface: string): Promise<void> =>
    ipcRenderer.invoke('start-capture', interface),

  stopCapture: (): Promise<void> => ipcRenderer.invoke('stop-capture'),

  getPackets: (): Promise<CapturedPacket[]> =>
    ipcRenderer.invoke('get-packets'),

  clearPackets: (): Promise<void> => ipcRenderer.invoke('clear-packets'),

  // Event listeners
  onNewPacket: (callback: (packet: CapturedPacket) => void) =>
    ipcRenderer.on('packet-received', callback),

  onCaptureStatus: (callback: (status: CaptureStatus) => void) =>
    ipcRenderer.on('capture-status', callback),

  onError: (callback: (error: string) => void) =>
    ipcRenderer.on('capture-error', callback),
}
```

### 4.4 Packet Parsing

**Dependencies:**

- Use `node-pcap` library to capture raw packets
- Use `pcap` module's built-in packet parser
- Manual IP header parsing for source/dest extraction

**Parsing Logic:**

1. Receive raw packet buffer from pcap
2. Parse Ethernet frame (skip if not needed)
3. Parse IP header (identify source, destination, protocol)
4. Parse transport layer (TCP/UDP) if present
5. Create CapturedPacket object
6. Store in buffer
7. Emit to renderer via IPC

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
// 1. Initialize pcap session
const session = pcap.createSession('eth0', {
  bufferSize: 0,
  filter: 'ip', // Capture only IP packets
  snaplen: 65535,
})

// 2. Set up packet handler
session.on('packet', (rawPacket) => {
  const packet = parsePacket(rawPacket)
  addToBuffer(packet)
  notifyRenderer(packet) // Send via IPC
})

// 3. Start capture
session.resume()

// 4. Stop capture
session.close()
```

### 6.3 UI/UX Patterns

**Application Flow:**

1. User launches app
2. App loads and displays list of network interfaces
3. User selects interface from dropdown
4. User clicks "Start Capture"
5. Packets stream into table in real-time
6. User can pause/resume without losing packets
7. User can clear table to reset
8. Packet count displayed in status bar

**UI States:**

- **Idle:** Interface selector enabled, Start button active, Stop disabled
- **Capturing:** Interface selector disabled, Start disabled, Stop/Pause active
- **Paused:** All buttons active, show pause indicator

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
  const packets = await ipcRenderer.invoke('start-capture', interfaceName)
} catch (error) {
  console.error('Capture failed:', error)
  showUserNotification('Failed to start capture. Check permissions.')
}
```

### 7.4 Logging

```typescript
// Development
console.debug('Packet parsed:', { sourceIP, destIP })

// Important events
console.log('Capture started on interface:', interfaceName)

// Errors
console.error('Permission denied for interface:', error.message)
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
    executableName: 'hl7-capture',
    icon: './public/icon',
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
        { entry: 'src/main/index.ts', config: 'vite.config.ts' },
        { entry: 'src/preload/index.ts', config: 'vite.config.ts' },
        { entry: 'src/renderer/index.tsx', config: 'vite.config.ts' },
      ],
    }),
  ],
}
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

**Phase 2: Packet Capture Logic** 5. Create `src/common/types.ts` - Define TypeScript interfaces 6. Install & verify pcap library 7. Implement network interface detection (`getNetworkInterfaces()`) 8. Implement packet capture start/stop (`startCapture()`, `stopCapture()`) 9. Implement packet parsing (`parsePacket()`) 10. Implement in-memory packet buffer management 11. Test: Manually verify capture works, packet parsing correct

**Phase 3: IPC Bridge** 12. Create `src/preload/index.ts` - IPC bridge with contextBridge 13. Expose window.electron API with all methods 14. Test: Console verify window.electron exists in DevTools

**Phase 4: React UI (Renderer)** 15. Create React entry point (`src/renderer/index.tsx`) 16. Create `src/renderer/App.tsx` - Main app component 17. Create component structure: - `InterfaceSelector.tsx` - Dropdown for interfaces - `ControlPanel.tsx` - Buttons (Start, Stop, Pause, Clear) - `PacketTable.tsx` - Table display - `StatusBar.tsx` - Status information 18. Wire up state management (useState, useEffect) 19. Connect IPC calls to UI buttons 20. Test: UI renders, buttons interactive

**Phase 5: Real-Time Updates** 21. Implement `onNewPacket` IPC listener in renderer 22. Update table in real-time as packets arrive 23. Update packet count in status bar 24. Test: Packets display in real-time while capturing

**Phase 6: Configuration & Build** 25. Create `forge.config.ts` - Electron Forge config 26. Create `vite.config.ts` - Vite build config 27. Configure build output and makers 28. Test: `npm run dev` launches dev environment

**Phase 7: Testing** 29. Create unit tests for packet parser 30. Create integration tests for capture flow 31. Configure Jest 32. Achieve 80%+ coverage on core logic 33. Test: `npm test` runs suite successfully

**Phase 8: Documentation** 34. Create README.md with overview, installation, usage 35. Create docs/DEVELOPMENT.md with dev setup 36. Create docs/ARCHITECTURE.md (optional, reference) 37. Add inline code comments for complex logic

### 13.3 Testing Strategy

**Unit Tests:**

- Test packet parser: Verify IP/protocol extraction
- Test interface detection: Mock os.networkInterfaces()
- Test buffer management: Add/clear operations

**Integration Tests:**

- Test capture flow: Start → receive packet → update buffer
- Test IPC communication: Renderer → Main → response
- Test UI state updates: Button click → capture state change

**Manual Testing Checklist:**

- [ ] Select interface, start capture, see packets
- [ ] Pause capture, verify packets stop arriving
- [ ] Resume capture, verify packets resume
- [ ] Click "Clear", verify table clears
- [ ] Stop capture cleanly without errors
- [ ] Multiple interfaces selectable
- [ ] App runs on Windows/Mac/Linux

**Performance Testing:**

- [ ] Handle 1,000+ packets without lag
- [ ] UI remains responsive during heavy capture
- [ ] Memory doesn't grow unbounded

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

**Main Process:**

- `/src/main/index.ts` - Electron app + packet capture logic
