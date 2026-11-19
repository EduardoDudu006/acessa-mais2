import React, { useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://acessa-backend.onrender.com/api/v1";

export default function FormularioOcorrencia({ usuarioId = 1, onSucesso }) {
  const [categoria, setCategoria] = useState("Calçada irregular ou buraco");
  const [descricao, setDescricao] = useState("");
  const [latitude, setLatitude] = useState("-8.05428");
  const [longitude, setLongitude] = useState("-34.88130");
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: "", mensagem: "" });

  const capturarLocalizacaoAtual = () => {
    if (!("geolocation" in navigator)) {
      setFeedback({
        tipo: "erro",
        mensagem: "Geolocalização não suportada pelo navegador.",
      });
      return;
    }

    setFeedback({ tipo: "info", mensagem: "Obtendo coordenadas GPS..." });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setFeedback({
          tipo: "sucesso",
          mensagem: "Localização atualizada com sucesso!",
        });
      },
      () => {
        setFeedback({
          tipo: "erro",
          mensagem:
            "Não foi possível obter o GPS. Verifique as permissões ou digite manualmente.",
        });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setFeedback({ tipo: "", mensagem: "" });

    try {
      const payload = {
        categoria,
        descricao,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        usuario_id: Number(usuarioId) || 1,
      };

      const res = await fetch(`${API_BASE}/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Falha ao registrar ocorrência.");
      }

      setFeedback({
        tipo: "sucesso",
        mensagem: `Ocorrência #${data.ocorrencia_id} registrada! Você ganhou +15 pontos.`,
      });
      setDescricao("");

      if (onSucesso) {
        setTimeout(() => onSucesso(data), 1500);
      }
    } catch (error) {
      setFeedback({ tipo: "erro", mensagem: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "#FFFFFF",
        padding: "24px",
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div>
        <label
          htmlFor="categoria"
          style={{
            display: "block",
            fontWeight: "700",
            color: "#0B3D91",
            marginBottom: "6px",
          }}
        >
          Tipo de Obstáculo / Problema
        </label>
        <select
          id="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          required
          style={{
            borderRadius: "8px",
            border: "1px solid #CBD5E0",
            width: "100%",
            padding: "10px",
            fontSize: "14px",
          }}
        >
          <option value="Calçada irregular ou buraco">
            Calçada irregular ou buraco
          </option>
          <option value="Ausência de rampa de acessibilidade">
            Ausência de rampa de acessibilidade
          </option>
          <option value="Rampa obstruída ou fora do padrão">
            Rampa obstruída ou fora do padrão
          </option>
          <option value="Piso tátil danificado ou ausente">
            Piso tátil danificado ou ausente
          </option>
          <option value="Obstáculo fixo na passagem (poste, entulho)">
            Obstáculo fixo na passagem (poste, entulho)
          </option>
          <option value="Semáforo sem sinal sonoro">
            Semáforo sem sinal sonoro
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor="descricao"
          style={{
            display: "block",
            fontWeight: "700",
            color: "#0B3D91",
            marginBottom: "6px",
          }}
        >
          Descrição e Ponto de Referência
        </label>
        <textarea
          id="descricao"
          rows="3"
          placeholder="Ex: Rampa bloqueada por veículo estacionado próximo à Av. Conde da Boa Vista..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #CBD5E0",
            fontSize: "14px",
            resize: "vertical",
          }}
        />
      </div>

      <div
        style={{
          backgroundColor: "#F7FAFC",
          padding: "14px",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <span
            style={{ fontWeight: "700", color: "#2D3748", fontSize: "13px" }}
          >
            Coordenadas Geográficas
          </span>
          <button
            type="button"
            onClick={capturarLocalizacaoAtual}
            style={{
              backgroundColor: "#00A86B",
              color: "#FFFFFF",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Usar Meu GPS Atual
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="latitude"
              style={{
                display: "block",
                fontSize: "12px",
                color: "#4A5568",
                marginBottom: "4px",
              }}
            >
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #CBD5E0",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="longitude"
              style={{
                display: "block",
                fontSize: "12px",
                color: "#4A5568",
                marginBottom: "4px",
              }}
            >
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #CBD5E0",
              }}
            />
          </div>
        </div>
      </div>

      {feedback.mensagem && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: "12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            backgroundColor:
              feedback.tipo === "erro"
                ? "#FED7D7"
                : feedback.tipo === "sucesso"
                ? "#C6F6D5"
                : "#EBF8FF",
            color:
              feedback.tipo === "erro"
                ? "#9B2C2C"
                : feedback.tipo === "sucesso"
                ? "#22543D"
                : "#2B6CB0",
          }}
        >
          {feedback.mensagem}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        style={{
          backgroundColor: "#FF7A00",
          color: "#FFFFFF",
          border: "none",
          padding: "14px",
          borderRadius: "10px",
          fontSize: "15px",
          fontWeight: "800",
          cursor: enviando ? "not-allowed" : "pointer",
          opacity: enviando ? 0.7 : 1,
        }}
      >
        {enviando ? "Registrando no Mapa..." : "Enviar Ocorrência"}
      </button>
    </form>
  );
}
