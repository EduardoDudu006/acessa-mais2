const API_BASE = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, signal } = options;
  const accessToken =
    token === undefined ? window.localStorage.getItem("acessa_token") : token;
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      `Não foi possível conectar à API em ${API_BASE}. Verifique se o backend está em execução.`,
    );
  }

  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join("; ")
      : detail;
    const error = new Error(
      message || `A API respondeu com erro ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getApiBase() {
  return API_BASE;
}
