import { describe, it, expect, vi } from "vitest";
import { isPrivateIp, isSafeUrl, resolveHostname, type DnsResolver } from "./ssrf";

function mockResolver(responses: Record<string, string[]>): DnsResolver {
  return {
    resolve4: vi.fn(async (hostname: string) => responses[hostname] ?? []),
    resolve6: vi.fn(async () => []),
  };
}

describe("isPrivateIp", () => {
  it("blocks loopback IPv4", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
  });

  it("blocks loopback IPv6", () => {
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("blocks 0.0.0.0", () => {
    expect(isPrivateIp("0.0.0.0")).toBe(true);
  });

  it("blocks 10.0.0.0/8 range", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("10.255.255.255")).toBe(true);
  });

  it("blocks 172.16.0.0/12 range", () => {
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
  });

  it("blocks 192.168.0.0/16 range", () => {
    expect(isPrivateIp("192.168.0.1")).toBe(true);
    expect(isPrivateIp("192.168.255.255")).toBe(true);
  });

  it("blocks 100.64.0.0/10 CGN range", () => {
    expect(isPrivateIp("100.64.0.1")).toBe(true);
    expect(isPrivateIp("100.127.255.255")).toBe(true);
  });

  it("blocks cloud metadata endpoint", () => {
    expect(isPrivateIp("169.254.169.254")).toBe(true);
  });

  it("blocks link-local IPv6 (fe80:)", () => {
    expect(isPrivateIp("fe80::1")).toBe(true);
  });

  it("blocks unique local IPv6 (fc/fd)", () => {
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fd00::1")).toBe(true);
  });

  it("allows public IPv4", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
  });

  it("allows non-IP hostnames (domain names)", () => {
    expect(isPrivateIp("example.com")).toBe(false);
    expect(isPrivateIp("not-an-ip")).toBe(false);
    expect(isPrivateIp("a.b.c.d")).toBe(false);
  });
});

describe("resolveHostname", () => {
  it("returns IPv4 addresses from the resolver", async () => {
    const ips = await resolveHostname("example.com", {
      resolve4: async () => ["93.184.216.34"],
      resolve6: async () => [],
    });
    expect(ips).toEqual(["93.184.216.34"]);
  });

  it("returns IPv6 addresses from the resolver", async () => {
    const ips = await resolveHostname("example.com", {
      resolve4: async () => [],
      resolve6: async () => ["2606:2800:220:1:248:1893:25c8:1946"],
    });
    expect(ips).toEqual(["2606:2800:220:1:248:1893:25c8:1946"]);
  });

  it("combines A and AAAA records", async () => {
    const ips = await resolveHostname("example.com", {
      resolve4: async () => ["93.184.216.34"],
      resolve6: async () => ["2606:2800:220:1:248:1893:25c8:1946"],
    });
    expect(ips).toContain("93.184.216.34");
    expect(ips).toContain("2606:2800:220:1:248:1893:25c8:1946");
  });
});

describe("isSafeUrl", () => {
  it("rejects non-http schemes", async () => {
    await expect(isSafeUrl("ftp://example.com")).resolves.toBe(false);
    await expect(isSafeUrl("file:///etc/passwd")).resolves.toBe(false);
    await expect(isSafeUrl("javascript:alert(1)")).resolves.toBe(false);
  });

  it("rejects localhost variants", async () => {
    await expect(isSafeUrl("http://localhost")).resolves.toBe(false);
    await expect(isSafeUrl("https://localhost")).resolves.toBe(false);
    await expect(isSafeUrl("http://127.0.0.1")).resolves.toBe(false);
    await expect(isSafeUrl("http://[::1]")).resolves.toBe(false);
  });

  it("rejects private IPs in URLs", async () => {
    await expect(isSafeUrl("http://192.168.1.1")).resolves.toBe(false);
    await expect(isSafeUrl("https://10.0.0.1/api")).resolves.toBe(false);
  });

  it("rejects metadata endpoint in URL", async () => {
    await expect(isSafeUrl("http://169.254.169.254/")).resolves.toBe(false);
  });

  it("rejects .local and .internal hostnames", async () => {
    await expect(isSafeUrl("https://app.local/data")).resolves.toBe(false);
    await expect(isSafeUrl("https://service.internal/api")).resolves.toBe(false);
  });

  it("rejects 0.0.0.0", async () => {
    await expect(isSafeUrl("http://0.0.0.0")).resolves.toBe(false);
  });

  it("rejects invalid URLs", async () => {
    await expect(isSafeUrl("")).resolves.toBe(false);
    await expect(isSafeUrl("not-a-url")).resolves.toBe(false);
  });

  it("allows valid public URLs with public DNS", async () => {
    const resolver = mockResolver({
      "example.com": ["93.184.216.34"],
      "stripe.com": ["151.101.1.140"],
      "www.npmjs.com": ["104.16.24.35"],
    });
    await expect(isSafeUrl("https://example.com", resolver)).resolves.toBe(true);
    await expect(isSafeUrl("https://stripe.com/docs/api", resolver)).resolves.toBe(true);
    await expect(isSafeUrl("https://www.npmjs.com/package/zod", resolver)).resolves.toBe(true);
  });

  it("allows public HTTP URLs", async () => {
    const resolver = mockResolver({ "example.com": ["93.184.216.34"] });
    await expect(isSafeUrl("http://example.com", resolver)).resolves.toBe(true);
  });

  it("rejects hostname resolving to 127.0.0.1", async () => {
    const resolver = mockResolver({ "evil.example": ["127.0.0.1"] });
    await expect(isSafeUrl("http://evil.example", resolver)).resolves.toBe(false);
  });

  it("rejects hostname resolving to RFC1918 IPv4", async () => {
    const resolver = mockResolver({ "evil.example": ["10.0.0.1"] });
    await expect(isSafeUrl("http://evil.example", resolver)).resolves.toBe(false);
  });

  it("rejects hostname resolving to ::1", async () => {
    const ipv6Resolver: DnsResolver = {
      resolve4: async () => [],
      resolve6: async () => ["::1"],
    };
    await expect(isSafeUrl("http://evil.example", ipv6Resolver)).resolves.toBe(false);
  });

  it("rejects hostname resolving to IPv6 unique-local", async () => {
    const resolver: DnsResolver = {
      resolve4: async () => [],
      resolve6: async () => ["fd00::1"],
    };
    await expect(isSafeUrl("http://evil.example", resolver)).resolves.toBe(false);
  });

  it("rejects mixed safe and blocked DNS answers", async () => {
    const resolver = mockResolver({ "evil.example": ["203.0.113.1", "10.0.0.1"] });
    await expect(isSafeUrl("http://evil.example", resolver)).resolves.toBe(false);
  });

  it("allows mixed safe DNS answers only", async () => {
    const resolver = mockResolver({ "good.example": ["203.0.113.1", "198.51.100.1"] });
    await expect(isSafeUrl("http://good.example", resolver)).resolves.toBe(true);
  });

  it("rejects IPv4-mapped IPv6 private address", async () => {
    const resolver: DnsResolver = {
      resolve4: async () => [],
      resolve6: async () => ["::ffff:192.168.1.1"],
    };
    await expect(isSafeUrl("http://evil.example", resolver)).resolves.toBe(false);
  });

  it("rejects metadata-service hostname resolving to 169.254.169.254", async () => {
    const resolver = mockResolver({ "metadata.example": ["169.254.169.254"] });
    await expect(isSafeUrl("http://metadata.example", resolver)).resolves.toBe(false);
  });

  it("rejects DNS failure (no records)", async () => {
    const resolver = mockResolver({});
    await expect(isSafeUrl("http://unknown.example", resolver)).resolves.toBe(false);
  });

  it("rejects hostname with no DNS records", async () => {
    const resolver = mockResolver({});
    await expect(isSafeUrl("http://no-records.example", resolver)).resolves.toBe(false);
  });
});
