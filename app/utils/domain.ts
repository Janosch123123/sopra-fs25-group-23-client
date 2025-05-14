// import process from "node:process";
import { isProduction } from "@/utils/environment";
/**
 * Returns the API base URL based on the current environment.
 * In production it retrieves the URL from NEXT_PUBLIC_PROD_API_URL (or falls back to a hardcoded url).
 * In development, it returns "http://localhost:8080".
 */
export function getApiDomain(): string {
  const prodUrl = process.env.NEXT_PUBLIC_PROD_API_URL ||
    "https://cogent-symbol-459811-c6.oa.r.appspot.com/"; // TODO: update with your production URL as needed.
  const devUrl = "http://localhost:8080";
  return isProduction() ? prodUrl : devUrl;
}

// Add this to @/utils/domain.ts
export function getWebSocketDomain(): string {
  if (isProduction()) {
    const prodUrl = process.env.NEXT_PUBLIC_PROD_WS_URL || 
      "wss://cogent-symbol-459811-c6.oa.r.appspot.com//ws";
    return prodUrl;
  } else {
    return "ws://localhost:8080/ws";
  }
}
