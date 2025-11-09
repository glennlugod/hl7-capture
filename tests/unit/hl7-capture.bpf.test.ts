import { HL7CaptureManager } from "../../src/main/hl7-capture";

import type { MarkerConfig } from "../../src/common/types";

describe("HL7CaptureManager.buildBPF", () => {
  const mgr = new HL7CaptureManager();
  const build = (cfg: MarkerConfig) =>
    (mgr as unknown as { buildBPF: (c: MarkerConfig) => string | undefined }).buildBPF(cfg);

  test("returns 'tcp' when no deviceIP/lisIP/lisPort", () => {
    const cfg: MarkerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "",
      lisIP: "",
      lisPort: undefined,
    };

    expect(build(cfg)).toBe("tcp");
  });

  test("builds filter for deviceIP only", () => {
    const cfg: MarkerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "192.168.1.10",
      lisIP: "",
      lisPort: undefined,
    };

    const bpf = build(cfg)!;
    expect(bpf.startsWith("tcp and ("));
    expect(bpf).toContain("src host 192.168.1.10");
    expect(bpf).toContain("dst host 192.168.1.10");
  });

  test("builds filter for lisIP and lisPort", () => {
    const cfg: MarkerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "",
      lisIP: "10.0.0.5",
      lisPort: 2575,
    };

    const bpf = build(cfg)!;
    expect(bpf).toContain("src host 10.0.0.5");
    expect(bpf).toContain("dst host 10.0.0.5");
    expect(bpf).toContain("src port 2575");
    expect(bpf).toContain("dst port 2575");
  });

  test("combines multiple parts with OR", () => {
    const cfg: MarkerConfig = {
      startMarker: 0x05,
      acknowledgeMarker: 0x06,
      endMarker: 0x04,
      deviceIP: "192.168.0.2",
      lisIP: "10.0.0.5",
      lisPort: 9999,
    };

    const bpf = build(cfg)!;
    // ensure multiple 'or' separators exist
    const orCount = (bpf.match(/ or /g) || []).length;
    expect(orCount).toBeGreaterThanOrEqual(2);
    expect(bpf).toContain("tcp and (");
  });
});
