import { Platform } from 'react-native';

// URL de produção no Render (conforme diagnosticado na auditoria)
export const API_URL = "https://acessa-backend.onrender.com/api/v1";

export async function apiRequest(endpoint, method = "GET", data = null, token = null) {
    const headers = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Erro na comunicação com o servidor.");
        }

        return result;
    } catch (error) {
        console.error("Erro na API Mobile:", error.message);
        throw error;
    }
}