import { describe, it, expect } from "vitest";
import { isPrivateOrReservedIp } from "./ipSafety";

describe("isPrivateOrReservedIp", () => {
  it("blocks the cloud metadata endpoint", () => {
    expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true);
  });

  it("blocks loopback", () => {
    expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("::1")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isPrivateOrReservedIp("10.0.0.5")).toBe(true);
    expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
    expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);
  });

  it("does not block adjacent public ranges that look similar", () => {
    expect(isPrivateOrReservedIp("172.15.0.1")).toBe(false); // just below 172.16.0.0/12
    expect(isPrivateOrReservedIp("172.32.0.1")).toBe(false); // just above 172.16.0.0/12
    expect(isPrivateOrReservedIp("11.0.0.1")).toBe(false);
  });

  it("blocks carrier-grade NAT and multicast/reserved ranges", () => {
    expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("224.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("255.255.255.255")).toBe(true);
  });

  it("blocks IPv6 unique-local and link-local ranges", () => {
    expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIp("fd12:3456::1")).toBe(true);
    expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
  });

  it("unwraps an IPv4-mapped IPv6 address and checks the embedded IPv4", () => {
    expect(isPrivateOrReservedIp("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("allows real public addresses", () => {
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIp("93.184.216.34")).toBe(false);
    expect(isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("refuses a malformed address rather than allowing it through", () => {
    expect(isPrivateOrReservedIp("not-an-ip")).toBe(true);
    expect(isPrivateOrReservedIp("999.999.999.999")).toBe(true);
  });
});
