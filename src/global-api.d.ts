// Ambient declaration for test environment: some builds reference a global `api` object.
// Declaring it here prevents TypeScript errors during test compilation.
declare const api: { [key: string]: any };

export {};
