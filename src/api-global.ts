// Module to declare a global `api` variable used in some runtime/test code.
// Keeping this as a TS module (not .d.ts) ensures ts-jest will include it during compilation.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api?: any;
  }
}
