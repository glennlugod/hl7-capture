import '@testing-library/jest-dom'

import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import MarkerConfigForm from '../../src/renderer/components/Configuration/MarkerConfigForm'

import type { Marker } from "../../src/common/types";

describe("MarkerConfigForm validation", () => {
  const defaultMarker: Marker = {
    id: "",
    name: "Test",
    type: "regex",
    pattern: "",
    caseSensitive: false,
    active: true,
  };

  const setup = (props = {}) => {
    const onChange = jest.fn();
    const onSave = jest.fn(() => Promise.resolve());
    render(
      <MarkerConfigForm marker={defaultMarker} onChange={onChange} onSave={onSave} {...props} />
    );
    return { onChange, onSave };
  };

  test("shows regex error for invalid pattern and disables Save", async () => {
    setup();
    // select regex type
    const typeSelect = screen.getByRole("combobox", { name: /type/i });
    fireEvent.change(typeSelect, { target: { value: "regex" } });
    // enter invalid regex
    const patternInput = screen.getByRole("textbox", { name: /pattern/i });
    fireEvent.change(patternInput, { target: { value: "(" } });
    // enter sample payload
    const sampleBox = screen.getByRole("textbox", { name: /sample payload/i });
    fireEvent.change(sampleBox, { target: { value: "test" } });
    // error message
    expect(await screen.findByText(/invalid regex pattern/i)).toBeInTheDocument();
    // Save button disabled
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  test("shows hex error for non-hex pattern and disables Save", async () => {
    setup();
    // select hex type
    const typeSelect = screen.getByRole("combobox", { name: /type/i });
    fireEvent.change(typeSelect, { target: { value: "hex" } });
    // enter invalid hex string
    const patternInput = screen.getByRole("textbox", { name: /pattern/i });
    fireEvent.change(patternInput, { target: { value: "GHI" } });
    // error message
    expect(await screen.findByText(/invalid hex format/i)).toBeInTheDocument();
    // Save button disabled
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  test("enables Save when pattern is valid (string type)", () => {
    setup({ marker: { ...defaultMarker, type: "string" } });
    // select string type
    const typeSelect = screen.getByRole("combobox", { name: /type/i });
    fireEvent.change(typeSelect, { target: { value: "string" } });
    // enter valid pattern
    const patternInput = screen.getByRole("textbox", { name: /pattern/i });
    fireEvent.change(patternInput, { target: { value: "abc" } });
    // no error message
    expect(screen.queryByText(/invalid/i)).toBeNull();
    // Save button enabled
    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeEnabled();
  });
});
