declare module "pcap-ng-parser" {
  import { Transform } from "stream";

  class PCAPNGParser extends Transform {
    interfaces: any[];
    constructor();
  }

  export default PCAPNGParser;
}
