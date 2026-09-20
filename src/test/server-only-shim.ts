// Test-environment stand-in for the "server-only" package. See
// vitest.config.ts for why this exists: Next.js's compiler special-cases
// that import to a no-op for server code and only lets it throw in client
// bundles; vitest has no such distinction, and tests always run as plain
// Node, so this mirrors the server-side (no-op) behavior.
export {};
