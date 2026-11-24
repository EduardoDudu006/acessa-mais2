import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    "http://10.0.2.2:8000/api/v1";

export async function apiRequest(
    endpoint,
    method = "GET",
    data = undefined,
    token = undefined,
) {
    const accessToken =
        token === undefined
            ? await AsyncStorage.getItem("acessa_token")
            : token;
    const headers = {};
    if (data !== undefined) {
        headers["Content-Type"] = "application/json";
    }
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    let response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: data === undefined ? undefined : JSON.stringify(data),
        });
    } catch (error) {
        console.error("Erro na API Mobile:", error.message);
        throw new Error(
            `Não foi possível conectar à API em ${API_URL}.`,
        );
    }

    const result =
        response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        const detail = result?.detail;
        const message = Array.isArray(detail)
            ? detail.map((item) => item.msg).join("; ")
            : detail;
        const error = new Error(
            message || "Erro na comunicação com o servidor.",
        );
        error.status = response.status;
        throw error;
    }
    return result;
}
