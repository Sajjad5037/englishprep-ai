
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!response.ok) {
          return null;
        }

        const data = await response.json();

        if (!data.access_token) {
          return null;
        }

        window.dispatchEvent(
          new CustomEvent("auth-token-refreshed", {
            detail: { access_token: data.access_token },
          })
        );

        return data.access_token;
      } catch (error) {
        console.error("Token refresh failed:", error);
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function authenticatedFetch(
  url,
  options = {},
  accessToken = null
) {
  async function sendRequest(token) {
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  // First attempt using the current access token.
  const response = await sendRequest(accessToken);

  if (response.status !== 401) {
    return response;
  }

  // Renew the access token after an authentication failure.
  const newAccessToken = await refreshAccessToken();

  if (!newAccessToken) {
    window.dispatchEvent(new Event("auth-session-expired"));
    return response;
  }

  // Retry the original request exactly once.
  return sendRequest(newAccessToken);
}
