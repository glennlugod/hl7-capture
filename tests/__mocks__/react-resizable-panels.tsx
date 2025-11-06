import React from "react";

export const Panel = ({ children, className }: any) => <div className={className}>{children}</div>;

export const PanelGroup = ({ children, direction }: any) => (
  <div data-direction={direction}>{children}</div>
);

export const PanelResizeHandle = ({ className }: any) => (
  <div className={className} data-testid="resize-handle" />
);
