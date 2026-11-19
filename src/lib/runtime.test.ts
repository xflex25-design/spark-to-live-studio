import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  isValidCollectionName,
  isValidUuid,
  normalizeEmail,
  verifyPassword,
} from "./runtime-crypto.ts";
import { injectOrgraaSdk } from "./runtime-sdk.ts";

describe("runtime-crypto", () => {
  it("hashes and verifies passwords with unique salts", async () => {
    const h1 = await hashPassword("secret-pass-123");
    const h2 = await hashPassword("secret-pass-123");
    assert.notEqual(h1, h2);
    assert.equal(await verifyPassword("secret-pass-123", h1), true);
    assert.equal(await verifyPassword("wrong-password", h1), false);
  });

  it("generates and hashes session tokens deterministically", async () => {
    const token = generateSessionToken();
    assert.equal(token.length, 64);
    const h1 = await hashSessionToken(token);
    const h2 = await hashSessionToken(token);
    assert.equal(h1, h2);
    assert.notEqual(h1, token);
  });

  it("validates UUIDs, collection names, and emails", () => {
    assert.equal(isValidUuid("550e8400-e29b-41d4-a716-446655440000"), true);
    assert.equal(isValidUuid("not-a-uuid"), false);
    assert.equal(isValidCollectionName("tasks"), true);
    assert.equal(isValidCollectionName("user_profiles-1"), true);
    assert.equal(isValidCollectionName("../secret"), false);
    assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
    assert.equal(normalizeEmail("invalid-email"), null);
  });
});

describe("runtime-sdk", () => {
  it("injects window.Orgraa SDK right after <head>", () => {
    const html = "<!doctype html><html><head><title>App</title></head><body>Hi</body></html>";
    const out = injectOrgraaSdk(
      html,
      "550e8400-e29b-41d4-a716-446655440000",
      "https://example.com/",
      "tok_123",
    );
    assert.match(out, /<head>\n<script>/);
    assert.match(out, /window\.Orgraa\s*=/);
    assert.match(out, /https:\/\/example\.com\/api\/runtime\/550e8400-e29b-41d4-a716-446655440000/);
    assert.match(out, /"initialToken":"tok_123"/);
  });
});
