declare const api: any;

export {};
// Ambient declaration for global `api` used in some runtime/test code
// Keep this out of the regular TS module system so it acts as a global declaration
declare var api: Record<string, unknown> | undefined;
