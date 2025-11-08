declare module "cap" {
  export class Cap {
    open(device: string, filter: string, bufferSize: number, buffer: Buffer): string;
    close(): void;
    setMinBytes(bytes: number): void;
    send(buffer: Buffer, length: number): number;
    on(event: "packet", callback: (nbytes: number, truncated: boolean) => void): void;
  }

  // Note: At runtime, the module exports 'decoders' (lowercase)
  export namespace decoders {
    export const PROTOCOL: {
      ETHERNET: {
        IPV4: number;
        IPV6: number;
        ARP: number;
      };
      IP: {
        TCP: number;
        UDP: number;
        ICMP: number;
        ICMPV6: number;
      };
    };

    export function Ethernet(buffer: Buffer): EthernetPacket | undefined;
    export function IPV4(buffer: Buffer, offset: number): IPV4Packet | undefined;
    export function IPV6(buffer: Buffer, offset: number): IPV6Packet | undefined;
    export function TCP(buffer: Buffer, offset: number): TCPPacket | undefined;
    export function UDP(buffer: Buffer, offset: number): UDPPacket | undefined;
  }

  interface EthernetPacket {
    info: {
      type: number;
    };
    offset: number;
  }

  interface IPV4Packet {
    info: {
      srcaddr: string;
      dstaddr: string;
      protocol: number;
      totallen: number;
    };
    offset: number;
    hdrlen: number;
  }

  interface IPV6Packet {
    info: {
      srcaddr: string;
      dstaddr: string;
      protocol: number;
    };
    offset: number;
    hdrlen: number;
  }

  interface TCPPacket {
    info: {
      srcport: number;
      dstport: number;
    };
    offset: number;
  }

  interface UDPPacket {
    info: {
      srcport: number;
      dstport: number;
    };
    offset: number;
  }

  export function deviceList(): Array<{
    name: string;
    addresses: Array<{
      addr: string;
      netmask?: string;
      broadaddr?: string;
    }>;
  }>;

  export function findDevice(ip?: string): string;
}
