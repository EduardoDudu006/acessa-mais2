import React, { useCallback, useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://acessa-backend.onrender.com/api/v1";

const criarIconeStatus = (status) => {
  const cores = {
    Confirmado: "#00A86B", // Verde Inclusão
    "Em Validação": "#FF7A00", // Laranja Transformação
    Pendente: "#0B3D91", // Azul Tecnológico
    Resolvido: "#4A5568",
  };
  const cor = cores[status] || "#0B3D91";

  return L.divIcon({
    className: "custom-pin",
    html: `<div aria-label="Status: ${status}" style="background-color:${cor}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 3px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

export default function MapaColaborativo({ usuarioId = 1, onPontosAtualizados }) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [mensagemFeedback, setMensagemFeedback] = useState("");

  const [rotaCoordenadas, setRotaCoordenadas] = useState([]);
  const [detalhesRota, setDetalhesRota] = useState(null);
  const [calculandoRota, setCalculandoRota] = useState(false);

  const posicaoRecife = [-8.05428, -34.8813];

  const buscarOcorrenciasMapa = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        lat: String(posicaoRecife[0]),
        lon: String(posicaoRecife[1]),
        raio_metros: "5000",
      });
      if (filtroStatus) {
        params.append("status", filtroStatus);
      }

      const res = await fetch(`${API_BASE}/ocorrencias?${params.toString()}`);
      const data = await res.json();
      setOcorrencias(data.ocorrencias || []);
    } catch (err) {
      console.error("Erro ao carregar mapa colaborativo:", err);
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    buscarOcorrenciasMapa();
  }, [buscarOcorrenciasMapa]);

  const handleValidar = async (ocorrenciaId) => {
    try {
      const res = await fetch(
        `${API_BASE}/ocorrencias/${ocorrenciaId}/validar?usuario_id=${usuarioId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao validar ocorrência.");
      }

      setMensagemFeedback(
        `Ocorrência validada! Novo ICO: ${data.novo_ico}% (+5 pts)`
      );
      if (onPontosAtualizados && typeof data.pontos_usuario === "number") {
        onPontosAtualizados(data.pontos_usuario);
      }
      buscarOcorrenciasMapa();
      setTimeout(() => setMensagemFeedback(""), 4000);
    } catch (error) {
      alert(`Não foi possível validar: ${error.message}`);
    }
  };

  const handleCalcularRotaExemplo = async () => {
    setCalculandoRota(true);
    try {
      const payload = {
        origem_lat: -8.0631,
        origem_lon: -34.8711, // Marco Zero
        destino_lat: -8.1175,
        destino_lon: -34.8968, // Boa Viagem
        perfil: "cadeira_de_rodas",
      };

      const res = await fetch(`${API_BASE}/rotas/calcular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao calcular rota.");
      }

      const coordenadasLeaflet = data.geometria.coordinates.map((coord) => [
        coord[1],
        coord[0],
      ]);
      setRotaCoordenadas(coordenadasLeaflet);
      setDetalhesRota({
        distancia: (data.distancia_metros / 1000).toFixed(2),
        tempo: data.tempo_estimado_minutos,
        obstaculos: data.obstaculos_proximos,
        seguranca: data.avaliar_seguranca,
      });
    } catch (error) {
      alert(`Erro ao calcular rota: ${error.message}`);
    } finally {
      setCalculandoRota(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          padding: "12px 16px",
          borderRadius: "12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <label
            htmlFor="filtro-status"
            style={{
              fontWeight: "700",
              color: "#0B3D91",
              fontSize: "14px",
              marginRight: "8px",
            }}
          >
            Filtrar:
          </label>
          <select
            id="filtro-status"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E0",
              fontSize: "13px",
              backgroundColor: "#F7FAFC",
            }}
          >
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Validação">Em Validação</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Resolvido">Resolvido</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleCalcularRotaExemplo}
          disabled={calculandoRota}
          style={{
            backgroundColor: "#FF7A00",
            color: "#FFFFFF",
            border: "none",
            padding: "9px 14px",
            borderRadius: "8px",
            cursor: calculandoRota ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          {calculandoRota
            ? "Calculando Rota..."
            : "Simular Rota Acessível (Marco Zero → Boa Viagem)"}
        </button>

        <span
          aria-live="polite"
          style={{
            fontSize: "13px",
            color: "#4A5568",
            fontWeight: "600",
            marginLeft: "auto",
          }}
        >
          {carregando ? "Atualizando mapa..." : `${ocorrencias.length} registros`}
        </span>
      </div>

      {detalhesRota && (
        <div
          style={{
            backgroundColor: "#EBF8FF",
            color: "#2B6CB0",
            padding: "10px 14px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "13px",
          }}
        >
          Rota calculada: {detalhesRota.distancia} km | Tempo est.:{" "}
          {detalhesRota.tempo} min | Obstáculos no trajeto:{" "}
          <b>{detalhesRota.obstaculos}</b> ({detalhesRota.seguranca})
        </div>
      )}

      {mensagemFeedback && (
        <div
          role="alert"
          style={{
            backgroundColor: "#C6F6D5",
            color: "#22543D",
            padding: "10px 14px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "13px",
          }}
        >
          {mensagemFeedback}
        </div>
      )}

      <div
        style={{
          height: "480px",
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          border: "2px solid #E2E8F0",
        }}
      >
        <MapContainer
          center={posicaoRecife}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {rotaCoordenadas.length > 0 && (
            <Polyline
              positions={rotaCoordenadas}
              pathOptions={{
                color:
                  detalhesRota && detalhesRota.obstaculos > 0
                    ? "#E53E3E"
                    : "#00A86B",
                weight: 6,
                opacity: 0.85,
              }}
            />
          )}

          {ocorrencias.map((oc) => (
            <Marker
              key={oc.id}
              position={[oc.latitude, oc.longitude]}
              icon={criarIconeStatus(oc.status)}
            >
              <Popup>
                <div
                  style={{
                    minWidth: "200px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <strong style={{ color: "#0B3D91", fontSize: "14px" }}>
                    {oc.categoria}
                  </strong>
                  <p style={{ margin: "2px 0", fontSize: "12px", color: "#2D3748" }}>
                    {oc.descricao || "Sem descrição detalhada."}
                  </p>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#718096",
                      borderTop: "1px solid #E2E8F0",
                      paddingTop: "4px",
                    }}
                  >
                    Status: <b>{oc.status}</b>
                    <br />
                    Confiança (ICO): <b>{oc.ico}%</b> | IPA: {oc.ipa}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleValidar(oc.id)}
                    style={{
                      backgroundColor: "#00A86B",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      marginTop: "4px",
                      textAlign: "center",
                    }}
                  >
                    ✓ Confirmar Ocorrência (+5 pts)
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
