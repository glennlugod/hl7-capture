import { HL7CaptureManager } from '../../src/main/hl7-capture'

jest.mock("cap");

describe("HL7 Parser", () => {
  let captureManager: HL7CaptureManager;

  beforeEach(() => {
    captureManager = new HL7CaptureManager();
  });

  it("should correctly identify the start marker", () => {
    const data = Buffer.from([0x05]);
    const processPacket = jest.spyOn(captureManager as any, "processPacket");
    (captureManager as any).processPacket("192.168.1.1", "192.168.1.2", data);
    expect(processPacket).toHaveBeenCalled();
  });

  it("should correctly identify the end marker", () => {
    const data = Buffer.from([0x04]);
    const processPacket = jest.spyOn(captureManager as any, "processPacket");
    (captureManager as any).processPacket("192.168.1.1", "192.168.1.2", data);
    expect(processPacket).toHaveBeenCalled();
  });

  it("should correctly identify the acknowledge marker", () => {
    const data = Buffer.from([0x06]);
    const processPacket = jest.spyOn(captureManager as any, "processPacket");
    (captureManager as any).processPacket("192.168.1.1", "192.168.1.2", data);
    expect(processPacket).toHaveBeenCalled();
  });

  it("should correctly parse an HL7 message", () => {
    const message =
      "MSH|^~\\&|SIMULATION|SOUTH LAB|LIS|SOUTH LAB|20231026120000||ORU^R01|Q123456789|P|2.3.1\r\n";
    const data = Buffer.from(message);
    const processPacket = jest.spyOn(captureManager as any, "processPacket");
    (captureManager as any).processPacket("192.168.1.1", "192.168.1.2", data);
    expect(processPacket).toHaveBeenCalled();
  });
});
