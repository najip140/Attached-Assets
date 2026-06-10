import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

export function initApiAuth() {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl) {
    setBaseUrl(apiUrl.replace(/\/+$/, ""));
  }

  setAuthTokenGetter(() => {
    return localStorage.getItem("pharmacy_token");
  });
}

export function getApiBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  return apiUrl ? apiUrl.replace(/\/+$/, "") : "";
}
