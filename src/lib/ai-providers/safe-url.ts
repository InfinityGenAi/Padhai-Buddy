import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    host === "metadata.google.internal" ||
    host.endsWith(".metadata.google.internal") ||
    host === "metadata" ||
    host.endsWith(".internal")
  );
}

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !isBlockedIpv4(address);
  if (version !== 6) return false;

  const host = address.toLowerCase().replace(/^\[|\]$/g, "");
  const firstGroup = Number.parseInt(host.split(":")[0] || "0", 16);

  // IPv6 global-unicast space is 2000::/3. Reject all other ranges, plus
  // documentation, benchmarking, 6to4 and other special-use ranges.
  if (firstGroup < 0x2000 || firstGroup > 0x3fff) return false;
  if (
    host.startsWith("2001:db8:") ||
    host.startsWith("2001:10:") ||
    host.startsWith("2001:2:") ||
    host.startsWith("2002:")
  ) {
    return false;
  }
  return true;
}

async function assertSafeProviderUrl(
  rawUrl: string,
  environment: string,
  baseUrl: boolean,
): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid provider URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Provider URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.hash || (baseUrl && url.search)) {
    throw new Error("Provider URL contains unsupported URL components");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!hostname || isBlockedHostname(hostname)) {
    throw new Error("Provider URL targets a restricted host");
  }

  // Local providers (for example Ollama or LM Studio) are useful in local
  // development. Never permit them in a deployed production environment.
  if (environment !== "production") return;

  if (url.protocol !== "https:") {
    throw new Error("Custom AI providers must use HTTPS in production");
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid")
  ) {
    throw new Error("Custom AI provider must use a public hostname");
  }

  if (isIP(hostname)) {
    if (!isPublicIp(hostname)) {
      throw new Error("Custom AI provider must use a public IP address");
    }
    return;
  }

  if (!hostname.includes(".")) {
    throw new Error("Custom AI provider must use a fully-qualified public hostname");
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Custom AI provider hostname could not be resolved");
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("Custom AI provider must resolve only to public IP addresses");
  }
}

/** Validate a user-configured base URL before saving or contacting a provider. */
export function assertSafeProviderBaseUrl(
  baseUrl: string,
  environment = process.env.NODE_ENV || "development",
): Promise<void> {
  return assertSafeProviderUrl(baseUrl, environment, true);
}

/**
 * Guard each outbound SDK request and reject redirects. This limits SSRF through
 * DNS names, private IPs, and redirect-based pivots to internal services.
 */
export const safeProviderFetch: typeof fetch = async (input, init) => {
  const requestUrl =
    input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.href
        : String(input);

  await assertSafeProviderUrl(requestUrl, process.env.NODE_ENV || "development", false);
  return fetch(input, { ...init, redirect: "error" });
};
