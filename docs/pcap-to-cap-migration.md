# Migration from pcap to cap Library

## Summary

Successfully replaced the `pcap` library with the `cap` library in the HL7 Capture application.

## Changes Made

### 1. Package Installation

- Installed `cap` package via npm
- Added to project dependencies

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

## Key Improvements

1. **Better API Design**: The cap library provides a cleaner, more structured API with dedicated decoders
2. **IPv6 Support**: Native support for both IPv4 and IPv6 packets
3. **Type Safety**: Comprehensive TypeScript definitions for better IDE support and type checking
4. **Cleaner Code**: Structured packet parsing using dedicated decoder functions instead of manual buffer manipulation

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
