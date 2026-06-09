import { setAuthTokenGetter } from "@workspace/api-client-react";

export function initApiAuth() {
  setAuthTokenGetter(() => {
    return localStorage.getItem("pharmacy_token");
  });
}
