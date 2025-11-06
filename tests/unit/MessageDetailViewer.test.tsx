import '@testing-library/jest-dom'

import React from 'react'

import { render } from '@testing-library/react'

import MessageDetailViewer from '../../src/renderer/components/MessageDetailViewer'

describe("MessageDetailViewer Component", () => {
  it("should render placeholder without errors", () => {
    const { getByText } = render(<MessageDetailViewer />);
    expect(getByText("Message Detail Viewer Placeholder")).toBeInTheDocument();
  });

  it("should render placeholder text", () => {
    const { container } = render(<MessageDetailViewer />);
    expect(container).toBeInTheDocument();
  });
});
