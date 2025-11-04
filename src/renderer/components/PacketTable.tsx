import React from "react";

import type { CapturedPacket } from "@common/types";

interface Props {
  packets: CapturedPacket[];
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function formatPort(port: number | undefined): string {
  return port ? `:${port}` : "";
}

export default function PacketTable({ packets }: Readonly<Props>): JSX.Element {
  return (
    <div className="packet-table-container">
      <table className="packet-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Source IP</th>
            <th>Destination IP</th>
            <th>Protocol</th>
            <th>Size (bytes)</th>
          </tr>
        </thead>
        <tbody>
          {packets.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-message">
                No packets captured yet
              </td>
            </tr>
          ) : (
            packets.map((packet) => (
              <tr key={packet.id}>
                <td>{formatTimestamp(packet.timestamp)}</td>
                <td>
                  {packet.sourceIP}
                  {formatPort(packet.sourcePort)}
                </td>
                <td>
                  {packet.destinationIP}
                  {formatPort(packet.destinationPort)}
                </td>
                <td>{packet.protocol}</td>
                <td>{packet.length}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
