declare module "pcap-parser" {
  import { EventEmitter } from "node:events";

  export function parse(stream: NodeJS.ReadableStream): EventEmitter;
}
