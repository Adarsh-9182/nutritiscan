import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { WEB_ORIGIN } from "./serviceOrigin";
const TOKEN = "nutritiscan.health-token.v1";
export const getHealthToken = () => Platform.OS === "web" ? Promise.resolve(null) : SecureStore.getItemAsync(TOKEN);
export async function healthRequest(path: string, options: RequestInit = {}) {
  const token = await getHealthToken();
  const headers = new Headers(options.headers);
  if (Platform.OS !== "web") { headers.set("X-Nutritiscan-Client", "native"); if (token) headers.set("Authorization", `Bearer ${token}`); }
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${WEB_ORIGIN}/api/health/${path}`, { ...options, headers, credentials: "include", signal: options.signal ?? AbortSignal.timeout(60000) });
  if (!response.ok) {
    if (response.status === 401 && Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN);
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === "string" ? error.detail : error.error ?? `The request failed (${response.status}).`);
  }
  if (response.status === 204) return null;
  const result = await response.json();
  if (path.startsWith("auth/") && result.access_token && Platform.OS !== "web") await SecureStore.setItemAsync(TOKEN, result.access_token);
  if (path === "auth/logout" && Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN);
  return result;
}
export function uploadForm(uri: string, name: string, mimeType: string) {
  const form = new FormData();
  form.append("file", { uri, name, type: mimeType } as unknown as Blob);
  return form;
}
