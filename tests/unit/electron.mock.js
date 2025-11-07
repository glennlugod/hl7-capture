// Provide a stable mocked electron API for tests
const defaultIfaces = [{ name: "lo" }];

function makeDefault() {
  const api = {
    // return interfaces synchronously to avoid async state updates during mount
    getNetworkInterfaces: jest.fn().mockImplementation(() => defaultIfaces),
    startCapture: jest.fn().mockResolvedValue(undefined),
    saveMarkerConfig: jest.fn().mockResolvedValue(undefined),
    validateMarkerConfig: jest.fn().mockResolvedValue(true),
  };

  // attach to globalThis and window for components using either
  Object.defineProperty(globalThis, "electron", {
    writable: true,
    value: api,
  });

  // some older code uses window.electron
  // attach to globalThis for tests
  if (globalThis.window) {
    Object.defineProperty(globalThis.window, "electron", {
      writable: true,
      value: api,
    });
  }

  return api;
}

makeDefault();

module.exports = makeDefault;
