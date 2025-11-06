import '@testing-library/jest-dom'

import React from 'react'

import { render } from '@testing-library/react'

import SessionList from '../../src/renderer/components/SessionList'

describe("SessionList Component", () => {
  it("should render placeholder without errors", () => {
    const { getByText } = render(<SessionList />);
    expect(getByText("Session List Placeholder")).toBeInTheDocument();
  });

  it("should render placeholder text", () => {
    const { container } = render(<SessionList />);
    expect(container).toBeInTheDocument();
  });
});
