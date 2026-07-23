import { describe, expect, it } from "vitest";
import { isSafeStoredUrl } from "./ssrf";

describe("stored URL safety", () => {
  it.each(["https://example.com/path", "http://public.example.org/source"])(
    "accepts public HTTP(S) URL %s",
    (url) => expect(isSafeStoredUrl(url)).toBe(true),
  );
  it.each([
    "ftp://example.com/file",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "http://localhost",
    "http://app.localhost",
    "http://service.internal",
    "http://host.local",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]",
    "http://[fe80::1]",
    "not-a-url",
  ])("rejects unsafe URL %s", (url) => expect(isSafeStoredUrl(url)).toBe(false));
});
