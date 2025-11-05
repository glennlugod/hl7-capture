import React from 'react'

import type { HL7Session } from "../../common/types";

interface Props {
  sessions: HL7Session[];
  onSelectSession: (session: HL7Session) => void;
}

export default function SessionList({ sessions, onSelectSession }: Readonly<Props>): JSX.Element {
  if (sessions.length === 0) {
    return (
      <div className="session-list">
        <h2>HL7 Sessions</h2>
        <p className="no-sessions">No sessions captured yet. Start capture to begin monitoring.</p>
      </div>
    );
  }

  return (
    <div className="session-list">
      <h2>HL7 Sessions ({sessions.length})</h2>
      <div className="session-items">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className="session-item"
            onClick={() => onSelectSession(session)}
          >
            <div className="session-header">
              <span className="session-id">Session #{session.sessionId}</span>
              <span className="session-time">
                {new Date(session.startTime).toLocaleTimeString()}
              </span>
            </div>
            <div className="session-details">
              <div className="detail-row">
                <span className="label">Duration:</span>
                <span className="value">
                  {session.endTime ? `${session.endTime - session.startTime}ms` : "In progress..."}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Messages:</span>
                <span className="value">{session.messages.length}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className={`value status-${session.isComplete ? "complete" : "incomplete"}`}>
                  {session.isComplete ? "Complete" : "Incomplete"}
                </span>
              </div>
            </div>
            <div className="session-elements">
              {session.elements.map((element, idx) => (
                <div key={idx} className={`element element-${element.type}`}>
                  <span className="element-type">{element.type.toUpperCase()}</span>
                  {element.type === "message" && element.content && (
                    <span className="element-content">{element.content.substring(0, 50)}...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
