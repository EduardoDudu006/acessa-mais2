import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Função para criar marcadores visuais acessíveis (com cores oficiais e sem depender só de cor)
const criarIconeStatus = (status) => {
    const cores = {
        "Confirmado": "#00A86B",     // Verde Inclusão
        "Em Validação": "#FF7A00",   // Laranja Transformação
        "Pendente": "#0B3D91",       // Azul Tecnológico
        "Resolvido": "#4A5568"
    };
    const cor = cores[status] || "#0B3D91";

    return L.divIcon({
        className: "custom-pin",
        html: `<div aria-label="Status: ${status}" style="background-color:${cor}; width:26px; height:26px; border-radius:50%; border:3px solid #FFFFFF; box-shadow:0 3px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
};

export default function MapaColaborativo() {
    const [ocorrencias, setOcorrencias] = useState([]);
    const [filtroStatus, setFiltroStatus] = useState("");
    const [carregando, setCarregando] = useState(true);

    // Coordenadas centrais oficiais: Recife - PE
    const posicaoRecife = [-8.05428, -34.8813];

    useEffect(() => {
        const buscarOcorrenciasMapa = async () => {
            setCarregando(true);
            try {
                const params = new URLSearchParams({
                    lat: posicaoRecife[0],
                    lon: posicaoRecife[1],
                    raio_metros: 5000 // Raio de busca de 5km na capital
                });
                if (filtroStatus) params.append("status", filtroStatus);

                // Conecta com a API no Render desenvolvida nas fases anteriores
                const res = await fetch(`https://acessa-backend.onrender.com/api/v1/ocorrencias?${params}`);
                const data = await res.json();
                setOcorrencias(data.ocorrencias || []);
            } catch (err) {
                console.error("Erro ao carregar mapa colaborativo:", err);
            } finally {
                setCarregando(false);
            }
        };

        buscarOcorrenciasMapa();
    }, [filtroStatus]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "14px", padding: "16px" }}>

            {/* Controles de Filtro com Acessibilidade (WCAG 2.1 AA) */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", backgroundColor: "#FFFFFF", padding: "12px 16px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <label htmlFor="filtro-status" style={{ fontWeight: "700", color: "#0B3D91", fontSize: "14px" }}>
                    Filtrar Ocorrências:
                </label>
                <select
                    id="filtro-status"
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E0", fontSize: "13px", backgroundColor: "#F7FAFC" }}
                >
                    <option value="">Todos os status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Em Validação">Em Validação</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Resolvido">Resolvido</option>
                </select>

                {/* Leitor de tela é avisado dinamicamente sobre a contagem */}
                <span aria-live="polite" style={{ fontSize: "13px", color: "#4A5568", fontWeight: "600", marginLeft: "auto" }}>
                    {carregando ? "Atualizando mapa..." : `${ocorrencias.length} registros encontrados em Recife`}
                </span>
            </div>

            {/* Container do Mapa OpenStreetMap / Leaflet */}
            <div style={{ height: "500px", width: "100%", borderRadius: "16px", overflow: "hidden", border: "2px solid #E2E8F0" }}>
                <MapContainer center={posicaoRecife} zoom={14} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {ocorrencias.map((oc) => (
                        <Marker
                            key={oc.id}
                            position={[oc.latitude, oc.longitude]}
                            icon={criarIconeStatus(oc.status)}
                        >
                            <Popup>
                                <div style={{ minWidth: "180px" }}>
                                    <strong style={{ color: "#0B3D91", fontSize: "14px" }}>{oc.categoria}</strong>
                                    <p style={{ margin: "6px 0", fontSize: "12px", color: "#2D3748" }}>{oc.descricao}</p>
                                    <div style={{ fontSize: "11px", color: "#718096", borderTop: "1px solid #E2E8F0", paddingTop: "4px" }}>
                                        Status: <b>{oc.status}</b><br />
                                        ICO: {oc.ico}% | IPA: {oc.ipa}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}