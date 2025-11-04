# User Story: Build Network Traffic Capture Desktop Application

**Story ID:** network-traffic-capture  
**Project:** hl7-capture  
**Level:** 0 (Atomic Change)  
**Type:** Greenfield Feature  
**Date Created:** 2025-11-04  
**Status:** Ready for Development

---

## Story Overview

### Story Title

Build Electron Desktop App for Network Traffic Capture with Basic Packet Visualization

### User Story Statement

**As a** Developer or Network Engineer  
**I want** A desktop application to capture network traffic on my system with a user-friendly interface  
**So that** I can easily observe and analyze network packets without using complex command-line tools

---

## Acceptance Criteria

### AC #1: Interface Detection

- **Given:** App launches successfully
- **When:** User clicks the interface selector dropdown
- **Then:** All available network interfaces are listed with names and IP addresses
- **Verified:** Dropdown shows ≥2 interfaces (or all available on system)

### AC #2: Capture Start

- **Given:** User has selected a network interface
- **When:** User clicks "Start Capture" button
- **Then:** App begins capturing packets on the selected interface
- **Verified:** Packet count increases, packets visible in the table

### AC #3: Packet Display

- **Given:** Capture is active and network traffic exists
- **When:** Packets arrive on the network
- **Then:** Each packet appears in table with columns: Timestamp, Source IP, Destination IP, Protocol, Size (bytes)
- **Verified:** Table data matches actual network traffic

### AC #4: Pause/Resume Capture

- **Given:** Capture is active
- **When:** User clicks "Pause" button
- **Then:** Packet capture pauses, table freezes, packet count stabilizes
- **When:** User clicks "Resume" button
- **Then:** Capture resumes collecting new packets
- **Verified:** No packets are lost during pause/resume cycle

### AC #5: Clear Packet Buffer

- **Given:** Packets are displayed in the table
- **When:** User clicks "Clear" button
- **Then:** Table becomes empty, packet count resets to 0
- **Verified:** All packets removed from memory, UI updated

### AC #6: Stop Capture Cleanly

- **Given:** Capture is active
- **When:** User clicks "Stop" button
- **Then:** Capture ends without errors, interface selector becomes enabled
- **Verified:** App remains stable, no memory leaks

### AC #7: UI Responsiveness Under Load

- **Given:** Heavy network traffic (100+ packets/sec)
- **When:** Capture is active
- **Then:** UI remains responsive, buttons clickable, no freezing
- **Verified:** Smooth packet table updates even under heavy load

### AC #8: Cross-Platform Compatibility

- **Given:** Windows, macOS, or Linux environment
- **When:** App launches and captures traffic
- **Then:** Application works identically on all platforms
- **Verified:** Tested and working on Windows, macOS, and Linux

---

## Tasks & Subtasks

### Phase 1: Foundation & Setup

- [ ] Create Node.js project structure

  - [ ] Initialize package.json with Electron + React dependencies
  - [ ] Set up TypeScript configuration (tsconfig.json)
  - [ ] Configure ESLint and Prettier
  - [ ] Create directory structure: src/main, src/renderer, src/preload, tests/

- [ ] Set up Electron framework
  - [ ] Create Electron Forge config (forge.config.ts)
  - [ ] Create Vite config (vite.config.ts)
  - [ ] Verify: `npm run dev` launches Electron window

### Phase 2: Packet Capture Core (Main Process)

- [ ] Create main process initialization (`src/main/index.ts`)

  - [ ] Initialize Electron app and window
  - [ ] Set up IPC handler structure
  - [ ] Reference: tech-spec.md Section 4.1

- [ ] Implement network interface detection

  - [ ] Create `getNetworkInterfaces()` function
  - [ ] Return list of available network interfaces
  - [ ] Test: Verify at least 2 interfaces detected

- [ ] Implement pcap packet capture

  - [ ] Install `node-pcap` library (AC #2 support)
  - [ ] Create `startCapture()` function for selected interface
  - [ ] Create `stopCapture()` function
  - [ ] Implement packet parsing logic
  - [ ] Reference: tech-spec.md Section 6.2

- [ ] Implement in-memory packet buffer
  - [ ] Create packet structure (CapturedPacket interface)
  - [ ] Implement buffer management (1,000 packet limit)
  - [ ] Create `getPackets()` function
  - [ ] Create `clearPackets()` function
  - [ ] Reference: tech-spec.md Section 4.1

### Phase 3: IPC Bridge (Preload Script)

- [ ] Create preload script (`src/preload/index.ts`)
  - [ ] Set up contextBridge for secure IPC
  - [ ] Expose window.electron API with all methods
  - [ ] Implement: getNetworkInterfaces, startCapture, stopCapture, getPackets, clearPackets
  - [ ] Implement: onNewPacket, onCaptureStatus, onError listeners
  - [ ] Reference: tech-spec.md Section 4.3
  - [ ] Test: Verify window.electron exists in DevTools console

### Phase 4: React UI (Renderer Process)

- [ ] Create React application structure

  - [ ] Create React entry point (`src/renderer/index.tsx`)
  - [ ] Create main App component (`src/renderer/App.tsx`)
  - [ ] Set up CSS/styling (basic, functional UI)

- [ ] Build UI components

  - [ ] `InterfaceSelector.tsx` - Dropdown for network interfaces (AC #1 support)
  - [ ] `ControlPanel.tsx` - Buttons for Start, Stop, Pause, Clear
  - [ ] `PacketTable.tsx` - Display packets with columns (AC #3 support)
  - [ ] `StatusBar.tsx` - Show capture status and packet count
  - [ ] Reference: tech-spec.md Section 4.2

- [ ] Implement UI state management
  - [ ] Use React hooks (useState, useEffect)
  - [ ] Manage: interfaces list, selected interface, capture status, packets, packet count
  - [ ] Connect UI buttons to IPC calls
  - [ ] Test: UI renders, buttons interactive

### Phase 5: Real-Time Updates

- [ ] Implement real-time packet display

  - [ ] Listen for `onNewPacket` events from main process
  - [ ] Update packet table in real-time (AC #3, AC #7 support)
  - [ ] Update packet counter in status bar
  - [ ] Test: Packets display while capturing

- [ ] Implement pause/resume functionality
  - [ ] Add pause state management
  - [ ] Update button UI when paused
  - [ ] Test: Pause works without losing packets (AC #4)

### Phase 6: Build & Configuration

- [ ] Create build configuration files

  - [ ] Create `forge.config.ts` (makers for Windows, macOS, Linux)
  - [ ] Create `vite.config.ts` (React + TS setup)
  - [ ] Create `.env.example` (environment variables)
  - [ ] Reference: tech-spec.md Section 11

- [ ] Verify build pipeline
  - [ ] Test: `npm run dev` launches dev environment
  - [ ] Test: `npm run package` creates distributable
  - [ ] Test: `npm run make` creates platform installers

### Phase 7: Testing

- [ ] Unit Tests

  - [ ] Create `tests/unit/packetParser.test.ts` - IP/protocol extraction
  - [ ] Test buffer management (add, clear operations)
  - [ ] Test interface detection
  - [ ] Achieve 80%+ coverage on core logic
  - [ ] Reference: tech-spec.md Section 13.3

- [ ] Integration Tests

  - [ ] Create `tests/integration/capture.test.ts`
  - [ ] Test capture flow: Start → receive packet → buffer updated
  - [ ] Test IPC communication (Renderer ↔ Main)
  - [ ] Test UI state updates from button clicks
  - [ ] Reference: tech-spec.md Section 13.3

- [ ] Manual Verification Tests
  - [ ] (AC #1) Select interface, see options in dropdown
  - [ ] (AC #2) Click Start, packet count increases
  - [ ] (AC #3) Verify packet data matches network traffic
  - [ ] (AC #4) Pause/resume without losing packets
  - [ ] (AC #5) Clear button empties table
  - [ ] (AC #6) Stop capture cleanly
  - [ ] (AC #7) No UI lag under heavy traffic
  - [ ] (AC #8) Test on Windows/macOS/Linux

### Phase 8: Documentation

- [ ] Create README.md

  - [ ] Project overview
  - [ ] Installation instructions
  - [ ] Usage guide
  - [ ] Development setup

- [ ] Create docs/DEVELOPMENT.md

  - [ ] Setup instructions for developers
  - [ ] Build and run commands
  - [ ] Contribution guidelines

- [ ] Add inline code comments
  - [ ] Complex logic in main process
  - [ ] IPC communication patterns
  - [ ] Packet parsing algorithms

---

## Technical Summary

### What We're Building

An Electron desktop application that captures and visualizes network traffic in real-time.

**Core Capabilities:**

1. Detect available network interfaces
2. Start/stop packet capture on selected interface
3. Display captured packets in a table (source, dest, protocol, size, timestamp)
4. Pause/resume capture without losing packets
5. Clear packet buffer

### Technology Stack

- **Node.js 20.10.0 LTS** - Runtime
- **Electron 27.0.0** - Desktop app framework
- **React 18.2.0** - UI framework
- **TypeScript 5.3.3** - Type-safe development
- **Vite 5.0.0** - Build tool
- **node-pcap 1.1.0+** - Network packet capture
- **Jest 29.7.0** - Testing framework

### Architecture Overview

- **Main Process:** Handles packet capture (pcap), manages packet buffer, exposes IPC API
- **Renderer Process:** React UI for interface selection, controls, and packet display
- **Preload Script:** Secure IPC bridge between main and renderer
- **In-Memory Storage:** Up to 1,000 packets stored during active capture

### Key Implementation Files

**New Files to Create:**

- `src/main/index.ts` - Packet capture + app lifecycle
- `src/preload/index.ts` - IPC bridge
- `src/renderer/App.tsx` - Main React component
- `src/renderer/components/*.tsx` - UI components (4 components)
- `src/common/types.ts` - Shared TypeScript types
- `forge.config.ts` - Build config
- `vite.config.ts` - Vite config
- `tests/unit/packetParser.test.ts` - Unit tests
- `tests/integration/capture.test.ts` - Integration tests

**Total New Files:** ~15-20 files

### Platform Requirements

**Windows:**

- User must install npcap from https://npcap.org/download
- App will provide download link

**macOS:**

- System libpcap included
- Optional: `brew install libpcap`

**Linux:**

- Install libpcap: `sudo apt-get install libpcap-dev`

### References to Tech-Spec

**For Implementation Details:**

- Architecture: Section 3 (High-Level, IPC Communication)
- Main Process: Section 4.1 (IPC Handlers, Packet Structure)
- Renderer: Section 4.2 (Components, State Management)
- Packet Parsing: Section 4.4 (Parsing Logic)
- Build Config: Section 11 (Forge, Vite, TypeScript)
- Implementation Steps: Section 13.2 (Phase-by-phase breakdown)
- Testing: Section 13.3 (Unit, Integration, Manual Tests)

---

## Files to Modify / Create

### Configuration Files

- `package.json` - Add dependencies and scripts (MODIFY)
- `tsconfig.json` - TypeScript config (CREATE)
- `forge.config.ts` - Electron Forge config (CREATE)
- `vite.config.ts` - Vite build config (CREATE)
- `.env.example` - Environment variables (CREATE)

### Source Code

- `src/main/index.ts` - Main process (CREATE)
- `src/preload/index.ts` - Preload script (CREATE)
- `src/renderer/index.tsx` - React entry (CREATE)
- `src/renderer/App.tsx` - Main component (CREATE)
- `src/renderer/components/InterfaceSelector.tsx` (CREATE)
- `src/renderer/components/ControlPanel.tsx` (CREATE)
- `src/renderer/components/PacketTable.tsx` (CREATE)
- `src/renderer/components/StatusBar.tsx` (CREATE)
- `src/common/types.ts` - Shared types (CREATE)
- `src/common/constants.ts` - Constants (CREATE)
- `src/renderer/utils/formatters.ts` - Utility functions (CREATE)
- `public/index.html` - HTML template (CREATE)

### Testing

- `tests/unit/packetParser.test.ts` (CREATE)
- `tests/integration/capture.test.ts` (CREATE)
- `jest.config.js` - Jest config (CREATE)
- `tests/__mocks__/pcap.ts` - Mock library (CREATE)

### Documentation

- `README.md` (CREATE)
- `docs/DEVELOPMENT.md` (CREATE)

---

## Test Locations

### Unit Tests

- Path: `tests/unit/packetParser.test.ts`
- Focus: Packet parsing, buffer management, interface detection
- Coverage Target: 80%+

### Integration Tests

- Path: `tests/integration/capture.test.ts`
- Focus: Capture flow, IPC communication, UI state updates

### E2E / Manual Tests

- Interface dropdown: Select and display interfaces
- Start capture: Verify packet count increases
- Packet table: Verify data matches network traffic
- Pause/resume: Verify no packet loss
- Clear: Verify table empties
- Stop: Verify app stays stable
- Performance: Verify no lag under 100+ packets/sec
- Cross-platform: Windows, macOS, Linux

---

## Story Points & Time Estimate

**Story Points:** 5 (Medium complexity - 3-5 days for experienced developer)

**Time Breakdown:**

- Phase 1 (Setup): 2-3 hours
- Phase 2 (Capture Core): 6-8 hours
- Phase 3 (IPC Bridge): 2-3 hours
- Phase 4 (React UI): 4-6 hours
- Phase 5 (Real-Time): 3-4 hours
- Phase 6 (Build): 1-2 hours
- Phase 7 (Testing): 4-6 hours
- Phase 8 (Docs): 1-2 hours

**Total Estimated:** 24-34 hours (~3-4 business days)

---

## Dependencies

### Internal Dependencies

- Shared types from `src/common/types.ts`
- IPC bridge via `src/preload/index.ts`
- All modules depend on main process packet capture

### External Dependencies

- **pcap / node-pcap** - Raw packet capture (system library dependency)
- **Electron** - Desktop application framework
- **React** - UI rendering
- **Vite** - Build tooling

### System Library Dependencies

- **Windows:** npcap (user must install from https://npcap.org)
- **macOS:** libpcap (system or Homebrew)
- **Linux:** libpcap-dev (install via apt)

### NPM Dependencies

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

## Existing Code References

**No existing code** - Greenfield project. All patterns are newly established.

**Reference Implementations from Tech-Spec:**

- Packet structure: tech-spec.md Section 4.1
- IPC communication: tech-spec.md Section 4.3
- Component patterns: tech-spec.md Section 7.2
- Error handling: tech-spec.md Section 7.3
- Testing patterns: tech-spec.md Section 13.3

---

## Architecture References

**Architecture Patterns to Establish:**

- **IPC Pattern:** Preload script as secure bridge (tech-spec.md Section 3.2)
- **State Management:** React hooks (useState, useEffect) - tech-spec.md Section 4.2
- **Packet Storage:** In-memory buffer with limit (tech-spec.md Section 3.2)
- **Error Handling:** User-friendly messages + logging (tech-spec.md Section 7.3)

**Code Organization:**

- Per-file pattern: Imports → Types → Constants → Main → Helpers (tech-spec.md Section 7.1)
- Component pattern: Functional components with hooks (tech-spec.md Section 7.2)
- Test pattern: Tests mirror src structure, BDD assertions (tech-spec.md Section 1.4)

---

## Dev Notes

### Implementation Approach

This is a Level 0 atomic change: a single, focused feature with clear scope. The tech-spec provides all necessary context for implementation.

**Start Here:**

1. Read tech-spec.md Section 3 (Architecture) for high-level understanding
2. Follow Phase 1-4 in Section 13.2 for step-by-step build
3. Reference each section as you implement each phase
4. Run manual tests from Section 13.3 during development

### Key Decisions Already Made

- ✅ Framework: Electron + React (not alternative)
- ✅ Packet Library: node-pcap (not tcpdump or alternatives)
- ✅ Architecture: Main process owns capture, React UI for display
- ✅ Storage: In-memory, 1,000 packet limit
- ✅ IPC: Preload script bridge (security best practice)

### Known Constraints

- Requires system libraries (libpcap/npcap) - handled in Phase 1
- Cross-platform support (Windows/Mac/Linux) - Electron handles this
- Real-time performance (100+ packets/sec) - Use React.memo if needed
- Memory management - 1,000 packet buffer prevents unbounded growth

### Testing Focus Areas

- Packet parser accuracy (verify IP extraction)
- Buffer management (add/clear operations)
- IPC communication (async/await handling)
- UI responsiveness under load
- Cross-platform compatibility

---

## Approval Sign-Off

**Story Status:** ✅ Ready for Implementation  
**Tech-Spec Completeness:** ✅ Comprehensive  
**Acceptance Criteria:** ✅ Clear and Measurable  
**Time Estimate:** ✅ Realistic (3-4 days)  
**Dependencies:** ✅ Documented

**Next Step:** Load DEV agent and run `dev-story` workflow to begin implementation.
