const TOKEN_STORAGE_KEY = 'nair_access_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  // Attempt one silent refresh if token expired
  if (res.status === 401) {
    try {
      const cloned = res.clone();
      const errBody = await cloned.json().catch(() => null);
      if (errBody?.code === 'TOKEN_EXPIRED') {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData?.token) {
            setAuthToken(refreshData.token);
            const retryHeaders = new Headers(init.headers || {});
            retryHeaders.set('Authorization', `Bearer ${refreshData.token}`);
            res = await fetch(input, {
              ...init,
              headers: retryHeaders,
              credentials: 'include',
            });
          }
        }
      }
    } catch {
      // Fall through and return original 401 response
    }
  }

  return res;
}

export async function downloadProtectedFile(url: string, fallbackFilename: string): Promise<void> {
  const res = await apiFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Download failed');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
