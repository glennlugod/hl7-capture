# hl7-capture UX Design Specification

_Created on 2025-11-06 by Glenn_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Project Vision & Context:**

hl7-capture is a specialized Electron desktop application designed for medical device engineers and LIS (Laboratory Information System) integrators. The application captures and analyzes HL7 medical device communication, transforming the chaos of raw network traffic into calm, focused insight.

**Target Users:** Expert-level medical device engineers who need to troubleshoot HL7 protocol communication between medical devices and LIS systems. These users are technically sophisticated but need a tool that brings clarity and focus to complex network troubleshooting scenarios.

**Core Experience:** Real-time comprehension of HL7 communication sessions combined with instant access to individual message details. Users should feel **calm and focused** - the interface transforms network traffic chaos into organized, understandable information.

**Key Design Principles:**

- **Clarity of information display** - Complex technical data presented in organized, scannable format
- **Speed and responsiveness** - Real-time updates without UI lag, instant message inspection
- **Professional, focused aesthetic** - Minimal distraction, maximum information density where it matters
- **Trust through transparency** - Show everything, hide nothing, make the invisible visible

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Chosen System: shadcn/ui**

**Rationale:**
shadcn/ui provides the ideal balance for hl7-capture between professional quality and complete customization control. Unlike traditional component libraries, shadcn/ui copies components directly into your project, giving you full ownership and the ability to tailor them precisely for medical device troubleshooting workflows.

**Key Benefits:**

- **Full code ownership** - Components live in your codebase, fully customizable
- **Radix UI primitives** - Industry-leading accessibility (WCAG 2.1 compliant) built-in
- **Tailwind CSS** - Utility-first styling for rapid customization
- **Modern aesthetic** - Clean, minimal design that won't compete with technical data
- **Composable** - Build complex UI patterns from simple primitives
- **TypeScript-first** - Perfect match for your Electron + TypeScript stack

**Component Library Provided:**

- Buttons (primary, secondary, ghost, destructive variants)
- Forms (inputs, selects, checkboxes, radio groups)
- Data display (tables, cards, badges, separators)
- Overlays (dialogs, popovers, tooltips, dropdowns)
- Navigation (tabs, command palette)
- Feedback (toast notifications, alerts, progress indicators)

**Custom Components Needed:**
While shadcn/ui provides excellent foundations, hl7-capture requires specialized components:

- **HL7 Session Timeline** - Bidirectional conversation visualization (Device ↔ LIS)
- **Hex/Decoded Message Viewer** - Split-pane viewer with synchronized scrolling
- **Real-time Session List** - Live-updating list with session state indicators
- **Protocol Marker Config Panel** - Custom marker byte configuration (0x05, 0x06, 0x04)
- **Network Interface Selector** - Platform-specific network interface picker

**Theming Approach:**
shadcn/ui uses CSS variables for theming, making it straightforward to create the "calm and focused" aesthetic:

- Professional color palette (defined in Step 4)
- Consistent spacing and typography
- Subtle shadows for depth without visual noise
- Focus states that are clear but not distracting

---

## 2. Core User Experience

### 2.1 Defining Experience

**Primary User Actions (Most Frequent):**

1. **Inspecting individual message details** - The action performed dozens of times per session
2. **Understanding what's happening in real-time** - Continuous monitoring of live sessions

**Core UX Challenge:**
Transform the overwhelming chaos of raw network packet data into calm, focused insight. Medical device engineers need to:

- Quickly understand the flow of communication between device and LIS
- Instantly drill into message details without losing context
- Maintain spatial awareness of where they are in a session timeline
- Switch between overview and detail views seamlessly

**Experience Goals:**

- **Effortless detail inspection** - Click a message, see everything (hex + decoded) instantly
- **Real-time comprehension** - Live sessions appear organized and understandable as they happen
- **Calm and focused feeling** - No visual chaos, clear hierarchy, professional aesthetic
- **Speed and responsiveness** - No lag between user action and system response

**Platform Context:**
Desktop application (Windows, macOS, Linux) - Electron + React + TypeScript. Users expect:

- Native desktop performance
- Keyboard shortcuts for power users
- Resizable panels and windows
- Professional desktop tool aesthetic (not web app)

### 2.2 Novel UX Patterns

**HL7 Session Timeline Visualization:**
The HL7 protocol operates as a conversation between medical device and LIS system. Unlike generic packet capture tools, hl7-capture must visualize this conversation structure:

- **Start marker (0x05)** → Device initiates transmission
- **HL7 messages (0x02...CR LF)** → Multiple messages sent
- **Acknowledgments (0x06)** → LIS confirms receipt of each message
- **End marker (0x04)** → Device ends transmission

**Pattern Design Decision:**
Use a vertical timeline visualization showing bidirectional flow:

```
Device                    LIS
  |---- START (0x05) ---->|
  |---- Message 1 -------->|
  |<----- ACK (0x06) ------|
  |---- Message 2 -------->|
  |<----- ACK (0x06) ------|
  |---- END (0x04) -------->|
```

This pattern is inspired by chat/messaging interfaces (familiar mental model) but adapted for protocol analysis. Key UX considerations:

- Click any element in timeline → inspect details
- Color coding for marker types (start/message/ack/end)
- Hover shows quick preview without losing timeline context
- Visual grouping shows complete sessions (start to end)

---

## 3. Visual Foundation

### 3.1 Color System

**Brand Foundation:**
The color system is built from the hl7-capture logo, which establishes a professional, trustworthy palette perfect for medical device troubleshooting tools.

**Primary Colors:**

- **Brand Blue** (Navy): `#1e3a5f` - Main brand color, used for headers, key text
- **Brand Teal** (Cyan): `#00bcd4` - Primary action color for buttons, links, active states
- **Brand Light**: `#e3f2fd` - Subtle backgrounds, hover states

**Neutral Palette (Grayscale):**

- **Gray 900**: `#0f172a` - Primary text, high emphasis
- **Gray 700**: `#334155` - Secondary text, medium emphasis
- **Gray 500**: `#64748b` - Tertiary text, low emphasis
- **Gray 300**: `#cbd5e1` - Borders, dividers
- **Gray 100**: `#f1f5f9` - Subtle backgrounds
- **White**: `#ffffff` - Main background

**Semantic Colors (Standard):**

- **Success**: `#10b981` (Green) - Successful operations, valid states
- **Warning**: `#f59e0b` (Amber) - Warnings, important notices
- **Error**: `#ef4444` (Red) - Errors, destructive actions, failed states
- **Info**: `#3b82f6` (Blue) - Informational messages, neutral highlights

**Data Visualization Palette (HL7 Timeline):**
For protocol marker differentiation and directional flow clarity:

- **Device → LIS** (Outbound): `#ff6b35` (Orange) - Medical device transmitting
- **LIS → Device** (Inbound): `#9333ea` (Purple) - LIS system responding
- **Start Marker**: `#10b981` (Green) - Session initialization (0x05)
- **Message**: `#00bcd4` (Teal) - HL7 message content (0x02...CR LF)
- **Acknowledgment**: `#3b82f6` (Blue) - PC confirms receipt (0x06)
- **End Marker**: `#64748b` (Gray) - Session termination (0x04)

**Color Usage Guidelines:**

**Primary Actions:**

- Buttons: Teal background with white text
- Hover: Darker teal (`#0097a7`)
- Active/Pressed: Even darker (`#00838f`)

**Navigation & Selection:**

- Active tab/item: Teal left border + teal text
- Hover: Light gray background (`#f1f5f9`)
- Selected session: Teal-tinted background (`#e0f7fa`)

**Backgrounds:**

- Main canvas: White (`#ffffff`)
- Panels/cards: White with subtle gray border
- Secondary areas: Light gray (`#f8fafc`)
- Code/hex display: Very light gray (`#f1f5f9`)

**Text Hierarchy:**

- Primary headings: Gray 900 (near black)
- Body text: Gray 700 (dark gray)
- Secondary text: Gray 500 (medium gray)
- Disabled text: Gray 300 (light gray)

### 3.2 Typography System

**Font Families:**

- **Interface**: System font stack for native desktop feel
  - `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif`
- **Monospace** (for hex data, protocol markers): `"JetBrains Mono", "Fira Code", "Consolas", monospace`

**Type Scale:**

- **Display**: 32px / 2rem, weight 700, line-height 1.2 - Page titles
- **H1**: 24px / 1.5rem, weight 600, line-height 1.3 - Section headers
- **H2**: 20px / 1.25rem, weight 600, line-height 1.4 - Subsection headers
- **H3**: 16px / 1rem, weight 600, line-height 1.5 - Component titles
- **Body**: 14px / 0.875rem, weight 400, line-height 1.6 - Main text
- **Small**: 12px / 0.75rem, weight 400, line-height 1.5 - Secondary text, captions
- **Tiny**: 11px / 0.6875rem, weight 400, line-height 1.4 - Timestamps, metadata

**Font Weights:**

- Regular: 400 (body text, labels)
- Medium: 500 (emphasis within body)
- Semibold: 600 (headings, buttons)
- Bold: 700 (display text, high emphasis)

**Special Typography:**

- **Hex Display**: Monospace, 13px, letter-spacing 0.5px for readability
- **Protocol Markers**: Monospace, 12px, colored by marker type
- **Timestamps**: Small size (12px), Gray 500, regular weight

### 3.3 Spacing System

**Base Unit: 4px** (0.25rem)

**Spacing Scale:**

- **xs**: 4px (0.25rem) - Tight spacing, inline elements
- **sm**: 8px (0.5rem) - Close relationships, icon padding
- **md**: 16px (1rem) - Standard component padding
- **lg**: 24px (1.5rem) - Section spacing, card padding
- **xl**: 32px (2rem) - Major section breaks
- **2xl**: 48px (3rem) - Page-level spacing
- **3xl**: 64px (4rem) - Large gaps (rare)

**Component-Specific Spacing:**

- **Button padding**: sm vertical (8px), md horizontal (16px)
- **Input padding**: sm vertical (8px), md horizontal (12px)
- **Card padding**: lg (24px)
- **Panel padding**: xl (32px)
- **List item padding**: sm vertical (8px), md horizontal (16px)
- **Table cell padding**: sm (8px) all sides
- **Modal padding**: lg (24px) content, xl (32px) for large modals

### 3.4 Elevation & Shadows

**Shadow System** (for depth without visual noise):

- **None**: No shadow - Flat elements
- **sm**: `0 1px 2px rgba(0, 0, 0, 0.05)` - Subtle lift, hover states
- **md**: `0 4px 6px rgba(0, 0, 0, 0.07)` - Cards, dropdowns
- **lg**: `0 10px 15px rgba(0, 0, 0, 0.1)` - Modals, popovers
- **xl**: `0 20px 25px rgba(0, 0, 0, 0.15)` - Major overlays (rare)

**Usage:**

- Cards: Shadow sm by default, md on hover
- Dropdowns/Selects: Shadow md when open
- Modals: Shadow lg for prominence
- Buttons: No shadow (flat design), subtle shadow on hover (sm)
- Timeline elements: No shadow (clean, minimal)

### 3.5 Border Radius

**Radius Scale:**

- **None**: 0px - Tables, data grids, strict layouts
- **sm**: 4px - Buttons, inputs, small elements
- **md**: 6px - Cards, panels, larger elements
- **lg**: 8px - Modals, large cards
- **full**: 9999px - Pills, badges, circular elements

**Usage Consistency:**

- Interactive elements (buttons, inputs): sm (4px)
- Content containers (cards, panels): md (6px)
- Overlays (modals, dialogs): lg (8px)
- Status indicators (badges): full (pill shape)

### 3.6 Visual Foundation Summary

**"Calm and Focused" Aesthetic Achieved Through:**

- **Professional color palette** - Brand blues/teals with standard semantics
- **Clear typography hierarchy** - System fonts for native feel, monospace for technical data
- **Generous spacing** - 4px base unit prevents crowding
- **Subtle shadows** - Depth without drama
- **Consistent radius** - Friendly but not overly rounded
- **High contrast** - Text on backgrounds meets WCAG AA (4.5:1 minimum)

**Rationale:**
This visual system creates the "calm and focused" feeling by using professional colors, clear type hierarchy, and subtle depth cues. The brand blue conveys trust (critical for medical tools), while teal provides energy for interactive elements. Data visualization colors (orange/purple for direction, green→gray for markers) make protocol flow instantly comprehensible without cognitive load.

**Interactive Visualizations:**

- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Layout Pattern: Three-Panel Desktop Layout**

For hl7-capture's desktop application, a classic three-panel layout provides the optimal balance of real-time monitoring, quick navigation, and detailed inspection:

```
┌─────────────────────────────────────────────────────┐
│ Header: App Title + Controls + Status              │
├─────────────────────────────────────────────────────┤
│ Configuration Panel (collapsible)                   │
│ [Interface Selector] [IPs] [Markers] [Start/Stop]  │
├─────────────────────────────────────────────────────┤
│                Main Content Area                     │
│ ┌──────────────┬─────────────────────────────────┐ │
│ │   Session    │    Message Detail Panel          │ │
│ │   List       │                                   │ │
│ │   (left)     │    [Hex View | Decoded View]     │ │
│ │              │                                   │ │
│ │   Timeline   │    • Timestamp                    │ │
│ │   View       │    • Direction (Device ↔ LIS)    │ │
│ │              │    • Marker type                  │ │
│ │              │    • Raw hex bytes                │ │
│ │              │    • Decoded HL7 message          │ │
│ │              │                                   │ │
│ └──────────────┴─────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Status Bar: Sessions count • Capture status        │
└─────────────────────────────────────────────────────┘
```

**Rationale:**

- **Left panel (Session List)**: Always visible, shows all captured sessions with real-time updates. Uses vertical timeline pattern for each session showing Device↔LIS flow.
- **Right panel (Message Detail)**: Larger space for detailed inspection - the most frequent action. Split-pane tabs for Hex/Decoded views.
- **Top configuration panel**: Collapsible to maximize data view space once configured. Remains accessible via toggle.
- **Resizable panels**: User can adjust widths based on their workflow (more timeline vs more detail).

**Visual Density: Balanced**

- Not sparse (wasted space) or dense (overwhelming)
- Session list: Compact but scannable with timeline visualization
- Message detail: Spacious with clear typography for technical data
- White space around content areas for breathing room

**Navigation Pattern: Direct Selection**

- No sidebar navigation (single-purpose tool)
- Session selection drives right panel content
- Keyboard shortcuts for power users (↑↓ for sessions, Tab for Hex/Decoded)
- Click anywhere on session timeline → jump to that message in detail panel

**Interaction Model: Master-Detail**

- Master list (sessions) on left stays stable during capture
- Detail panel (right) updates on selection
- Real-time updates don't disrupt current selection
- New sessions append to bottom of list, auto-scroll optional

**Data Hierarchy Emphasis:**

- **High emphasis**: Current selected message in detail panel
- **Medium emphasis**: Session list items with timeline badges
- **Low emphasis**: Configuration panel when collapsed, status bar

**Professional Desktop Aesthetic:**

- Clean, minimal chrome (no excessive borders)
- System-native window controls
- Subtle panel dividers (Gray 300)
- Focus on content, not decoration

---

## 5. User Journey Flows

### 5.1 Critical User Paths

**Journey 1: Initial Setup and First Capture**

**User Goal:** Configure hl7-capture and start monitoring HL7 communication

**Flow:**

1. **Launch Application**
   - User sees: Configuration panel expanded, empty session list, "Start Capture" disabled
   - Action needed: Configure capture parameters

2. **Select Network Interface**
   - User clicks: Interface dropdown
   - System shows: List of available network interfaces (eth0, wlan0, etc.)
   - User selects: Interface where HL7 traffic flows
   - Feedback: Interface name displayed in dropdown

3. **Configure IP Addresses**
   - User enters: Source IP (medical device)
   - User enters: Destination IP (LIS system)
   - Validation: IP format checked on blur
   - Feedback: Green checkmark if valid, red error if invalid

4. **Review Protocol Markers** (Optional)
   - Default markers shown: 0x05 (start), 0x06 (ack), 0x04 (end)
   - User can modify if device uses non-standard markers
   - Feedback: Marker configuration saved

5. **Start Capture**
   - User clicks: "Start Capture" button (teal, prominent)
   - System response:
     - Button changes to "Stop Capture" (red)
     - Configuration panel locks (grayed out)
     - Status bar shows: "Capturing on [interface]"
     - Session list ready for real-time updates

6. **Monitor Real-Time Sessions**
   - As HL7 traffic flows:
     - New sessions appear in left panel
     - Timeline visualization shows Device→LIS→Device flow
     - Markers color-coded (green start, teal messages, blue acks, gray end)
   - User sees: Live protocol communication as it happens

**Success State:** Active capture with sessions streaming in real-time

---

**Journey 2: Inspecting Message Details (Most Frequent)**

**User Goal:** Examine specific HL7 message content to diagnose communication issues

**Flow:**

1. **Session Selection**
   - User sees: List of captured sessions with timeline previews
   - User clicks: Any session in the list
   - System response:
     - Session highlights (teal background)
     - Right panel shows first message in session

2. **Navigate Within Session Timeline**
   - User sees: Timeline of all markers/messages in selected session
   - User clicks: Specific message or marker on timeline
   - System response: Detail panel updates instantly (< 50ms)

3. **View Message Details**
   - Detail panel displays:
     - Timestamp (top)
     - Direction badge (orange "Device→LIS" or purple "LIS→Device")
     - Marker type badge (color-coded)
     - Tabs: "Hex View" | "Decoded View"

4. **Switch Between Hex and Decoded**
   - User clicks: "Hex View" tab
     - Shows: Raw hexadecimal bytes with addresses
     - Monospace font, letter-spaced for readability
   - User clicks: "Decoded View" tab
     - Shows: Parsed HL7 message structure
     - Segments, fields highlighted
   - Tab switching: Instant, no delay

5. **Quick Navigate to Next/Previous**
   - Keyboard: ↑/↓ arrows move through messages
   - Visual: Selected message highlights in timeline
   - Detail panel updates with each selection

**Success State:** User finds problematic message, understands issue via hex/decoded view

---

**Journey 3: Troubleshooting with Multiple Sessions**

**User Goal:** Compare multiple device transmissions to identify pattern or anomaly

**Flow:**

1. **Capture Multiple Sessions**
   - Device sends multiple transmissions
   - Each complete session (0x05 to 0x04) appears as separate item
   - Sessions stack vertically in list

2. **Quick Session Comparison**
   - User clicks: Session 1 → reviews timeline
   - User clicks: Session 2 → reviews timeline
   - User notices: Different number of messages or missing ACKs

3. **Identify Anomaly**
   - User clicks: Message in problematic session
   - Hex view shows: Unexpected byte sequence
   - User understands: Communication failure reason

4. **Clear Sessions and Re-Test**
   - User clicks: "Clear" button
   - Confirmation: Optional (config setting)
   - All sessions removed, ready for fresh capture

**Success State:** Issue identified, documented, ready for retry

---

**Journey 4: Changing Protocol Markers**

**User Goal:** Capture HL7 variant using non-standard markers

**Flow:**

1. **Stop Current Capture**
   - User clicks: "Stop Capture"
   - Configuration panel unlocks

2. **Open Marker Configuration**
   - User clicks: "Configure Markers" (or expand panel section)
   - Modal/panel shows: Three hex byte inputs

3. **Modify Markers**
   - User changes: Start marker from 0x05 to 0x0B (example variant)
   - User changes: End marker from 0x04 to 0x0C
   - Validation: Must be unique, single-byte hex values
   - Feedback: Real-time validation

4. **Save and Restart**
   - User clicks: "Save Configuration"
   - User clicks: "Start Capture"
   - System uses new markers for parsing

5. **Verify New Markers Detected**
   - HL7 traffic flows
   - Sessions appear using new marker detection
   - Timeline shows correct start/end markers

**Success State:** Custom markers successfully recognized and visualized

---

## 6. Component Library

### 6.1 Component Strategy

**shadcn/ui Base Components (Use As-Is):**

- **Buttons**: Primary (teal bg), Secondary (teal outline), Ghost (text only)
- **Inputs**: Text inputs for IPs, validated on blur
- **Select/Dropdown**: Network interface selector, marker inputs
- **Badge**: Protocol marker type indicators (start/message/ack/end)
- **Tabs**: Hex View / Decoded View switcher in detail panel
- **Separator**: Panel dividers (subtle, Gray 300)
- **Tooltip**: Hover help for configuration options

**Custom HL7-Specific Components:**

### **1. HL7SessionTimeline Component**

**Purpose:** Visualize bidirectional Device↔LIS conversation

**Anatomy:**

- Container: Vertical timeline layout
- Timeline axis: Center line showing bidirectional flow
- Message nodes: Clickable circles/badges on left (device) or right (LIS)
- Connection lines: Show flow direction with arrow indicators
- Color coding: By marker type (green/teal/blue/gray)

**Props:**

```typescript
interface HL7SessionTimelineProps {
  session: HL7Session;
  selectedMessageId?: string;
  onMessageSelect: (messageId: string) => void;
  compact?: boolean; // For list view vs detail view
}
```

**States:**

- Default: All markers visible, color-coded
- Hover: Show message preview tooltip
- Selected: Highlight selected message with teal glow
- Active capture: Pulse animation on newest marker

### **2. MessageDetailViewer Component**

**Purpose:** Display hex and decoded message views with tabs

**Anatomy:**

- Header: Timestamp, direction badge, marker type badge
- Tab bar: "Hex View" | "Decoded View"
- Content area: Scrollable with monospace font for hex, structured for decoded

**Props:**

```typescript
interface MessageDetailViewerProps {
  message: HL7Element;
  defaultView: "hex" | "decoded";
}
```

**States:**

- Hex View active: Monospace, address column + hex bytes + ASCII
- Decoded View active: Structured HL7 segments with syntax highlighting
- Loading: Skeleton while parsing large messages
- Empty: "Select a message" placeholder

### **3. SessionList Component**

**Purpose:** Scrollable list of captured sessions with live updates

**Anatomy:**

- List container: Vertical scroll, fixed height
- Session items: Clickable cards with timeline preview
- Session header: Timestamp, device/LIS IPs, status badge
- Compact timeline: Mini version of HL7SessionTimeline

**Props:**

```typescript
interface SessionListProps {
  sessions: HL7Session[];
  selectedSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  autoScroll?: boolean;
}
```

**States:**

- Default item: White background, subtle border
- Hover: Light gray background (#f1f5f9)
- Selected: Teal background (#e0f7fa) with left border
- New session: Fade-in animation
- Complete: Green badge, incomplete: Orange badge

### **4. ConfigurationPanel Component**

**Purpose:** Collapsible panel for capture configuration

**Anatomy:**

- Header: Title + collapse toggle
- Interface selector: Dropdown of network interfaces
- IP inputs: Source (device) and destination (LIS)
- Marker config: Expandable section with hex inputs
- Action buttons: Start/Stop/Clear

**Props:**

```typescript
interface ConfigurationPanelProps {
  isCapturing: boolean;
  onStartCapture: (config: CaptureConfig) => void;
  onStopCapture: () => void;
  onClearSessions: () => void;
}
```

**States:**

- Idle: All inputs editable, Start enabled, Stop disabled
- Capturing: All inputs disabled (locked), Start disabled, Stop enabled
- Collapsed: Only toggle button visible, minimal height
- Validation error: Red border on invalid input, error message below

**Component Accessibility:**

- All interactive elements keyboard accessible (Tab navigation)
- Focus indicators clearly visible (2px teal outline)
- ARIA labels on all inputs and buttons
- Screen reader announcements for session updates
- Color not sole indicator (use icons + text)

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

**Button Patterns:**

- **Primary action** (Start Capture): Teal bg, white text, prominent placement
- **Destructive action** (Stop, Clear): Red text or red outline, confirmation if configured
- **Secondary actions** (Configure): Gray outline, lower visual weight
- **Disabled state**: Gray bg, gray text, cursor not-allowed

**Form Validation:**

- **Timing**: Validate on blur (when user leaves field)
- **Error display**: Red border + error text below field
- **Success indication**: Green checkmark icon inline
- **Required fields**: Asterisk + ARIA required attribute
- **Help text**: Gray caption text below input, icon triggers tooltip

**Feedback & Loading Patterns:**

- **Success**: Toast notification (green), top-right, 3s auto-dismiss
- **Error**: Toast notification (red), top-right, 5s auto-dismiss with close button
- **Warning**: Banner at top of panel (amber), dismissible
- **Loading states**: Spinner for async ops (< 0.5s hidden, > 0.5s show spinner)
- **Real-time updates**: Smooth animations, no jarring insertions

**Selection & Navigation Patterns:**

- **Session selection**: Click anywhere on session item
- **Active indication**: Teal background + left border
- **Hover preview**: Tooltip with session summary (timestamp, message count)
- **Keyboard navigation**: ↑/↓ for sessions, ←/→ for messages in timeline, Tab for Hex/Decoded
- **Focus management**: Maintain focus on keyboard navigation

**Empty States:**

- **No sessions captured**: Large icon + "Start capture to see sessions" text + Start button
- **No message selected**: "Select a session to view messages" in detail panel
- **Network interfaces unavailable**: Error message + troubleshooting link

**Confirmation Patterns:**

- **Clear sessions**: Optional confirmation dialog (user preference in settings)
- **Stop capture**: No confirmation (non-destructive, can restart)
- **Change configuration during capture**: Auto-stop with warning

**Real-Time Update Patterns:**

- **New session arrives**: Append to list with fade-in (300ms)
- **Auto-scroll**: Optional, toggleable, scrolls to newest session
- **Selection persistence**: Selected session stays selected during updates
- **Performance**: Virtual scrolling if > 100 sessions

**Notification Patterns:**

- **Placement**: Top-right corner
- **Duration**: Success 3s, Info 4s, Warning 5s, Error until dismissed
- **Stacking**: Max 3 notifications, oldest fades out
- **Priority**: Errors always visible, success can be batched

**Date/Time Patterns:**

- **Format**: ISO 8601 for timestamps: "2025-11-06 10:30:15.123"
- **Relative time**: Optional "5 seconds ago" for very recent
- **Timezone**: Display in local timezone, store UTC

**Data Display Patterns:**

- **Hex view**: Address column (8 chars) + 16 bytes per row + ASCII representation
- **IP addresses**: Standard dotted notation with validation
- **Protocol markers**: Hex notation (0x05) with descriptive label
- **Session duration**: HH:MM:SS.mmm format

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

**Desktop-Only Application:**

hl7-capture is a desktop application (Electron) targeting Windows, macOS, and Linux. Responsive design focuses on **window resizing**, not mobile devices.

**Minimum Window Size:**

- Width: 1024px minimum (ideal: 1280px+)
- Height: 768px minimum (ideal: 900px+)

**Resizable Panels:**

- **Session List width**: 300px min, 600px max, default 400px
- **Message Detail width**: Flexible, takes remaining space
- **Configuration Panel height**: 120px collapsed, 240px expanded

**Window Resize Behavior:**

- Panels resize proportionally
- Session list maintains min/max width constraints
- Timeline visualizations scale down gracefully
- Hex view maintains readability (minimum 60 chars wide)

**Zoom Levels:**

- Support browser zoom: 90%, 100%, 110%, 125%
- UI scales proportionally
- Text remains readable at all zoom levels

### 8.2 Accessibility Strategy

**WCAG 2.1 Level AA Compliance:**

**Color Contrast:**

- Text on backgrounds: Minimum 4.5:1 ratio (AA standard)
- Large text (18px+): Minimum 3:1 ratio
- Interactive elements: 3:1 contrast with background
- Status indicators: Don't rely solely on color (use icons + text)

**Keyboard Navigation:**

- **Tab order**: Logical flow (config → sessions → detail)
- **Focus indicators**: 2px teal outline, clearly visible
- **Keyboard shortcuts**:
  - `Ctrl/Cmd + S`: Start/Stop capture
  - `Ctrl/Cmd + K`: Clear sessions
  - `↑/↓`: Navigate sessions
  - `←/→`: Navigate messages in timeline
  - `Tab`: Switch between Hex/Decoded views
  - `Esc`: Close modals/collapse panels

**Screen Reader Support:**

- **ARIA labels**: All interactive elements labeled
- **ARIA live regions**: Announce new sessions ("New session captured")
- **Role attributes**: Proper semantic roles (button, listbox, tab, etc.)
- **Alt text**: Descriptive text for any icons or visual indicators

**Touch Targets:**

- Minimum size: 44x44px for all interactive elements
- Adequate spacing: 8px between adjacent targets
- Large hit areas for timeline markers

**Focus Management:**

- Focus moves logically through interface
- Modal dialogs trap focus
- Focus returns to trigger after modal close
- Skip links for keyboard-only users (if applicable)

**Error Identification:**

- Errors clearly identified with text, not just color
- Instructions for fixing errors
- Form validation messages linked to inputs (aria-describedby)

**Motion & Animation:**

- Respect prefers-reduced-motion system setting
- Animations can be disabled in preferences
- No auto-playing animations that can't be paused

---

## 9. Implementation Guidance

### 9.1 Completion Summary

**UX Design Specification Complete!**

This document provides comprehensive UX guidance for implementing hl7-capture with a "calm and focused" user experience optimized for medical device engineers.

**What We've Defined:**

✅ **Design System Foundation**

- shadcn/ui for base components with full code ownership
- Custom HL7-specific components (SessionTimeline, MessageViewer, etc.)

✅ **Visual Design System**

- Brand-based color palette (navy blue + teal) with data visualization colors
- Typography system (Inter + JetBrains Mono)
- Spacing (4px base unit), shadows (subtle depth), border radius (professional)

✅ **Layout & Information Architecture**

- Three-panel desktop layout (Config + Session List + Message Detail)
- Master-detail interaction pattern
- Resizable panels for workflow flexibility

✅ **User Journey Flows**

- Initial setup and first capture
- Message detail inspection (most frequent action)
- Multi-session troubleshooting
- Protocol marker configuration

✅ **Component Library**

- shadcn/ui base components
- 4 custom HL7 components with detailed specifications
- Props, states, and accessibility requirements

✅ **UX Patterns**

- Button hierarchy and states
- Form validation timing and display
- Feedback patterns (toast, loading, errors)
- Selection and navigation consistency
- Real-time update handling

✅ **Accessibility**

- WCAG 2.1 Level AA compliance
- Keyboard navigation with shortcuts
- Screen reader support
- High contrast, clear focus indicators

**Implementation Priorities:**

1. **Phase 1**: Visual foundation (colors, typography, spacing) + shadcn/ui setup
2. **Phase 2**: Layout structure (three panels, resizing)
3. **Phase 3**: Custom components (SessionTimeline, MessageViewer)
4. **Phase 4**: Real-time updates and performance optimization
5. **Phase 5**: Accessibility testing and refinement

**Developer Handoff:**

This specification provides:

- Complete design system with exact values (hex codes, px values, ratios)
- Component specifications with TypeScript interfaces
- User flow documentation for implementation validation
- Accessibility requirements for WCAG compliance
- UX pattern decisions for consistency

**Next Steps:**

With this UX specification complete, you're ready to:

1. **Run sprint-planning workflow** - Break down into implementation stories
2. **Set up shadcn/ui** - Install and configure base components
3. **Implement layout structure** - Three-panel desktop layout
4. **Build custom components** - SessionTimeline, MessageViewer, etc.
5. **Integrate real-time capture** - Connect to Electron main process

**Design Rationale Summary:**

The "calm and focused" aesthetic is achieved through:

- **Professional color palette** - Brand blues/teals convey trust and technical competence
- **Clear information hierarchy** - Typography and spacing prevent overwhelm
- **Purposeful interactions** - Every click leads somewhere meaningful
- **Real-time clarity** - Live updates organized, not chaotic
- **Data visualization** - Protocol flow instantly comprehensible through color and layout

This UX foundation will guide development to create a tool medical device engineers will prefer over generic packet capture tools like Wireshark.

---

## Appendix

### Related Documents

- Technical Specification: `docs/tech-spec.md`
- Story: `docs/stories/story-hl7-device-capture.md`

### Core Interactive Deliverables

This UX Design Specification will be created through visual collaboration:

- **Color Theme Visualizer**: `docs/ux-color-themes.html`
  - Interactive HTML showing all color theme options explored
  - Live UI component examples in each theme
  - Side-by-side comparison and semantic color usage

- **Design Direction Mockups**: `docs/ux-design-directions.html`
  - Interactive HTML with 6-8 complete design approaches
  - Full-screen mockups of key screens
  - Design philosophy and rationale for each direction

### Next Steps & Follow-Up Workflows

This UX Design Specification can serve as input to:

- **Solution Architecture Workflow** - Define technical architecture with UX context
- **Component Showcase Workflow** - Create interactive component library
- **Sprint Planning** - Break down into implementation stories

### Version History

| Date       | Version | Changes                         | Author |
| ---------- | ------- | ------------------------------- | ------ |
| 2025-11-06 | 1.0     | Initial UX Design Specification | Glenn  |

---

_This UX Design Specification is being created through collaborative design facilitation, not template generation. All decisions are made with user input and documented with rationale._
