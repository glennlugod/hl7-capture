# Migration note: historical cap integration (deprecated)

## Summary

This document described a previous migration to the `cap` library. The project has since
deprecated the `cap` runtime integration in favor of a single, supported external
capture backend: `dumpcap` (Wireshark). The historical notes remain for reference only.

## Changes Made

Note: the `cap` package is no longer required or used by the application.

### 2. Type Definitions (`src/types/cap.d.ts`)

Created comprehensive TypeScript definitions for the cap library including:

- `Cap` class with methods: `open()`, `close()`, `setMinBytes()`, `send()`, `read()`
- `Decoders` namespace with:
  - Protocol constants (ETHERNET, IP protocols)
  - Decoder functions for Ethernet, IPv4, IPv6, TCP, UDP
- Interface definitions for packet structures

### 3. Main Application Changes (`src/main/index.ts`)

#### Import Changes

```typescript
// Before:
const pcap = await import("pcap");

// After:
import { Cap, Decoders } from "cap";
```

#### Capture Session Initialization

```typescript
// Before:
captureSession = pcap.createSession(interfaceName, {
  bufferSize: 0,
  filter: "ip",
  snaplen: 65535,
});

// After:
captureSession = new Cap();
const filter = "ip or ip6";
captureSession.open(interfaceName, filter, BUFFER_SIZE, capBuffer);
captureSession.setMinBytes(0);
```

#### Packet Capture Loop

- Replaced event-based `on("packet")` with callback-based `read()` method
- Implemented continuous packet reading loop using `setImmediate()`
- Added proper pause/resume handling

#### Packet Parsing

- Replaced manual buffer parsing with cap's `Decoders` API
- Added support for both IPv4 and IPv6 packets
- Used structured packet decoders for Ethernet, IP, TCP, and UDP layers
- Improved error handling and packet data extraction

## Recommendation

Use `dumpcap` as the single supported capture backend. It produces pcap/pcapng output which the
application parses via a streaming parser. This avoids native bindings and driver packaging issues
on Windows.

## Testing Recommendations

1. Test packet capture on various network interfaces
2. Verify IPv4 and IPv6 packet parsing
3. Test TCP and UDP protocol detection
4. Verify pause/resume functionality
5. Test packet buffer management and overflow handling
6. Ensure proper resource cleanup on capture stop

## Notes

- The cap library uses a callback-based approach for packet reading, requiring a continuous read loop
- Buffer management is handled through a pre-allocated buffer (`capBuffer`)
- The implementation maintains backward compatibility with the existing IPC interface
