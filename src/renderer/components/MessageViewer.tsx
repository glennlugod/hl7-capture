import React from 'react'

import type { HL7Session } from "../../common/types";

interface Props {
  session: HL7Session | null;
  onClose: () => void;
}

export default function MessageViewer({ session, onClose }: Readonly<Props>): JSX.Element | null {
  if (!session) {
    return null;
  }

  return (
    <div className="message-viewer-overlay" onClick={onClose}>
      <div className="message-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="message-viewer-header">
          <h2>Session #{session.sessionId} Details</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="message-viewer-content">
          <div className="session-info">
            <div className="info-row">
              <span className="label">Device IP:</span>
              <span className="value">{session.deviceIP}</span>
            </div>
            <div className="info-row">
              <span className="label">PC IP:</span>
              <span className="value">{session.pcIP}</span>
            </div>
            <div className="info-row">
              <span className="label">Start Time:</span>
              <span className="value">{new Date(session.startTime).toLocaleString()}</span>
            </div>
            {session.endTime && (
              <div className="info-row">
                <span className="label">End Time:</span>
                <span className="value">{new Date(session.endTime).toLocaleString()}</span>
              </div>
            )}
            <div className="info-row">
              <span className="label">Duration:</span>
              <span className="value">
                {session.endTime ? `${session.endTime - session.startTime}ms` : "In progress..."}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Status:</span>
              <span className={`value ${session.isComplete ? "complete" : "incomplete"}`}>
                {session.isComplete ? "Complete" : "Incomplete"}
              </span>
            </div>
          </div>

          <div className="elements-section">
            <h3>Session Elements ({session.elements.length})</h3>
            <div className="elements-list">
              {session.elements.map((element, idx) => (
                <div key={idx} className={`element-detail element-${element.type}`}>
                  <div className="element-header">
                    <span className="element-type">{element.type.toUpperCase()}</span>
                    <span className="element-direction">{element.direction}</span>
                    <span className="element-time">
                      {new Date(element.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="element-data">
                    <div className="hex-data">
                      <strong>Hex:</strong> {element.hexData}
                    </div>
                    {element.content && (
                      <div className="decoded-data">
                        <strong>Decoded:</strong>
                        <pre>{element.content}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {session.messages.length > 0 && (
            <div className="messages-section">
              <h3>HL7 Messages ({session.messages.length})</h3>
              <div className="messages-list">
                {session.messages.map((message, idx) => (
                  <div key={idx} className="hl7-message">
                    <div className="message-header">Message {idx + 1}</div>
                    <pre className="message-content">{message}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
