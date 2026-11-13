import React, { useState } from "react";
import MapaColaborativo from "./components/MapaColaborativo";

export default function App() {
    const [abaAtiva, setAbaAtiva] = useState("Mapa");

    return (
        <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", backgroundColor: "#F0F4F8" }}>
            {/* Menu Lateral (Sidebar) */}
            <aside style={{ width: "240px", backgroundColor: "#0B3D91", color: "#FFFFFF", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: "900", margin: "0 0 20px 0", letterSpacing: "1px" }}>
                    ACESSA<span style={{ color: "#00A86B" }}>+</span>
                </h1>

                <button
                    onClick={() => setAbaAtiva("Mapa")}
                    style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        textAlign: "left",
                        fontWeight: "700",
                        cursor: "pointer",
                        backgroundColor: abaAtiva === "Mapa" ? "#FF7A00" : "transparent",
                        color: "#FFFFFF"
                    }}
                >
                    Mapa Colaborativo
                </button>

                <button
                    onClick={() => setAbaAtiva("Registrar")}
                    style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "none",
                        textAlign: "left",
                        fontWeight: "700",
                        cursor: "pointer",
                        backgroundColor: abaAtiva === "Registrar" ? "#FF7A00" : "transparent",
                        color: "#FFFFFF"
                    }}
                >
                    Registrar Obstáculo
                </button>
            </aside>

            {/* Área Principal de Conteúdo */}
            <main style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
                <header style={{ marginBottom: "20px", borderBottom: "1px solid #CBD5E0", paddingBottom: "12px" }}>
                    <h2 style={{ margin: 0, color: "#0B3D91" }}>
                        {abaAtiva === "Mapa" ? "Monitoramento Urbano - Recife/PE" : "Novo Registro de Acessibilidade"}
                    </h2>
                </header>

                {abaAtiva === "Mapa" && <MapaColaborativo />}

                {abaAtiva === "Registrar" && (
                    <div style={{ backgroundColor: "#FFFFFF", padding: "24px", borderRadius: "12px" }}>
                        <p style={{ color: "#4A5568" }}>Formulário de registro web será integrado na Fase 7.</p>
                    </div>
                )}
            </main>
        </div>
    );
}