# HL7-Capture

A specialized Electron desktop application for capturing and analyzing HL7 medical device-to-LIS (Laboratory Information System) communication over TCP/IP networks.

## Overview

HL7-Capture monitors TCP traffic between medical devices and laboratory information systems, detecting HL7 protocol markers (0x05, 0x06, 0x02, 0x04) and organizing captured data into meaningful sessions. This tool is designed for medical device integration specialists, laboratory IT staff, and healthcare system administrators.

## Features

### Core Functionality

- **Real-time TCP Packet Capture**: Monitor network traffic on selected interfaces
- **HL7 Protocol Detection**: Automatically detect and parse HL7 communication markers
- **Session Management**: Group related transmissions (0x05 start to 0x04 end) into sessions
- **Message Viewer**: Detailed view of captured HL7 messages with hex and decoded representations
- **Configuration Panel**: Customize HL7 markers and filter by IP addresses

### HL7 Protocol Markers

- **0x05**: Start of transmission (device initiates communication)
- **0x06**: Acknowledgment (PC confirms receipt)
- **0x02...CR LF**: HL7 message data
- **0x04**: End of transmission

## Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Npcap** (Windows) or **libpcap** (macOS/Linux) for packet capture
  - Windows: Install Npcap from https://npcap.com/
  - macOS: libpcap is pre-installed
  - Linux: `sudo apt-get install libpcap-dev`

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/hl7-capture.git
cd hl7-capture
```

2. Install dependencies:

```bash
npm install
```

3. Set up Npcap (Windows only):

```bash
npm run postinstall
```

## Development

### Run in Development Mode

```bash
npm run dev
```

This starts the Electron application with hot-reloading enabled.

### Build for Production

```bash
npm run package
```

Creates distributable packages in the `out` directory.

### Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Code Quality

```bash
npm run lint          # Check for linting errors
npm run format        # Format code with Prettier
```

### Usage

### 1. Select Network Interface

Choose the single network interface where medical device traffic will be captured. The interface should be on the same network segment as the device and LIS.

### 2. Configure HL7 Markers

Set the hexadecimal values for HL7 protocol markers:

- **Start Marker**: Default 0x05
- **Acknowledge Marker**: Default 0x06
- **End Marker**: Default 0x04

Optionally filter by IP addresses:

- **Device IP**: Medical device IP address
- **LIS PC IP**: Laboratory information system IP address

### 3. Start Capture

Click "Start Capture" to begin monitoring network traffic. The application will:

- Capture TCP packets on the selected interface
- Detect HL7 markers in the traffic
- Group transmissions into sessions
- Display sessions in real-time

### 4. View Sessions

Click on any session in the list to view detailed information:

- Session metadata (IPs, timestamps, duration)
- Individual protocol elements (start, ack, message, end)
- Decoded HL7 messages
- Hex representation of all data

### 5. Stop Capture

Click "Stop Capture" to halt monitoring. Sessions remain visible until cleared.

## Architecture

### Dumpcap development (Windows)

If you want to develop and test the Dumpcap-based capture backend locally on Windows, follow these steps:

1. Install Npcap (https://npcap.com/) with the option to install WinPcap API compatibility.
2. Ensure `dumpcap.exe` is available on your PATH or note the installation folder (typically `C:\Program Files\Wireshark`).
3. Use the included PowerShell helper to run dumpcap with safe arguments and output pcap data to stdout for the adapter to consume during development.

Example (PowerShell):

```powershell
# Run dumpcap on interface index 1, filter TCP traffic, write to stdout
& "C:\Program Files\Wireshark\dumpcap.exe" -i 1 -f "tcp" -w - | Out-Default
```

Or use the helper script in this repo:

```powershell
.\scripts\run-dumpcap-dev.ps1 -Interface 1 -Filter "tcp"
```

Notes:

- Running dumpcap may require elevated privileges depending on your Npcap installation options.
- The helper script is intended for local development and debugging only. It intentionally avoids modifying PATH or system settings.

### Technology Stack

- **Electron**: Cross-platform desktop framework
- **React**: UI framework with TypeScript
- **Node.js**: Main process runtime
- **Vite**: Fast development build tool
- **Jest**: Testing framework

### Project Structure

```
hl7-capture/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Application entry point
│   │   └── hl7-capture.ts # HL7 capture manager
│   ├── preload/           # IPC bridge (secure context)
│   │   └── index.ts       # Expose APIs to renderer
│   ├── renderer/          # React UI
│   │   ├── App.tsx        # Main application component
│   │   ├── App.css        # Application styles
│   │   └── components/    # React components
│   ├── common/            # Shared types and utilities
│   │   └── types.ts       # TypeScript interfaces
│   └── types/             # TypeScript declarations
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── docs/                  # Documentation
│   ├── tech-spec.md       # Technical specification
│   └── stories/           # User stories
└── package.json           # Project configuration
```

### Data Flow

1. **Main Process**: Captures TCP packets using pcap, detects HL7 markers
2. **IPC Bridge**: Securely exposes capture APIs to renderer via contextBridge
3. **Renderer Process**: React UI displays sessions and allows user interaction
4. **Event Listeners**: Real-time updates pushed from main to renderer

## HL7 Protocol Details

### Session Structure

A complete HL7 session consists of:

1. **Device → PC**: 0x05 (Start marker)
2. **PC → Device**: 0x06 (Acknowledgment)
3. **Device → PC**: 0x02 + HL7 Message + CR LF
4. **Device → PC**: 0x04 (End marker)

### HL7 Message Format

HL7 messages follow the standard format:

```
MSH|^~\&|SendingApp|SendingFac|ReceivingApp|ReceivingFac|Timestamp||MessageType|MessageID|ProcessingID|Version
```

Example:

```
MSH|^~\&|Device|Lab|LIS|Lab|20231105120000||ORU^R01|123|P|2.3
```

## Configuration

### Marker Configuration

Customize HL7 markers in the UI or modify default values in `src/main/hl7-capture.ts`:

```typescript
this.markerConfig = {
  startMarker: 0x05,
  acknowledgeMarker: 0x06,
  endMarker: 0x04,
  sourceIP: "",
  destinationIP: "",
};
```

### Session Limits

Maximum number of stored sessions (prevents memory issues):

```typescript
private maxSessions: number = 100;
```

## Troubleshooting

### Capture Not Starting

- Verify Npcap/libpcap is installed correctly
- Check network interface selection
- Ensure application has appropriate permissions
- On Windows, run as Administrator if needed

### No Sessions Detected

- Verify marker configuration matches device protocol
- Check IP address filters (leave blank to capture all traffic)
- Confirm device and LIS are communicating on selected interface
- Use a network analyzer (Wireshark) to verify traffic exists

### Performance Issues

- Reduce number of stored sessions (clear sessions regularly)
- Filter by specific IP addresses to reduce captured traffic
- Close message viewer when not needed

## Security Considerations

- **Packet Capture**: Requires elevated privileges on most systems
- **Context Isolation**: Enabled for security (IPC via contextBridge only)
- **Sandbox Mode**: Renderer process runs in sandbox for isolation
- **PHI Data**: Application captures medical data - ensure HIPAA compliance

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Run linter before committing
- Use conventional commit messages

## Testing

### Unit Tests

Located in `tests/unit/`, covering:

- Packet parsing logic
- HL7 marker detection
- Session management
- Message decoding

### Integration Tests

Located in `tests/integration/`, covering:

- End-to-end capture workflows
- IPC communication
- UI interactions

### Test Coverage

Run `npm run test:coverage` to generate coverage report. Target: 80%+ coverage.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- HL7 International for protocol specifications
- Electron team for the desktop framework
- Medical device integration community

## Support

For issues, questions, or contributions:

- GitHub Issues: https://github.com/yourusername/hl7-capture/issues
- Documentation: See `docs/` directory
- Technical Spec: `docs/tech-spec.md`

## Roadmap

### Future Enhancements

- [ ] Export sessions to CSV/JSON
- [ ] Real-time packet statistics
- [ ] HL7 message validation
- [ ] Session timeline visualization
- [ ] Filter and search capabilities
- [ ] Persistent session storage
- [ ] PCAP file import/export
- [ ] Multiple capture profiles
- [ ] Advanced HL7 message parsing

## Version History

### v1.0.0 (Current)

- Initial release
- Real-time TCP packet capture
- HL7 protocol marker detection
- Session management and visualization
- Message viewer with hex/decoded views
- Configurable markers and IP filtering
