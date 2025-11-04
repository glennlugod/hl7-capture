declare module "pcap" {
  interface CreateSessionOptions {
    bufferSize?: number;
    filter?: string;
    snaplen?: number;
  }

  interface CaptureSession {
    on(event: string, callback: (...args: any[]) => void): void;
    resume(): void;
    pause(): void;
    close(): void;
  }

  export function createSession(
    interfaceName: string,
    options?: CreateSessionOptions
  ): CaptureSession;
}
