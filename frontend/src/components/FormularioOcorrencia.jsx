import React, { useState } from "react";
import BuscaEndereco from "./BuscaEndereco";
import SeletorLocalizacao from "./SeletorLocalizacao";
import { apiRequest } from "../services/api";

const CATEGORIAS = [
  "Calçada irregular ou buraco",
  "Ausência de rampa de acessibilidade",
  "Rampa obstruída ou fora do padrão",
  "Piso tátil danificado ou ausente",
  "Obstáculo fixo na passagem (poste, entulho)",
  "Semáforo sem sinal sonoro",
];

export default function FormularioOcorrencia({ onSucesso }) {
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState(null);
  const [centroMapa, setCentroMapa] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  function selecionarLocalizacao(local, origem = "endereco") {
    setLocalizacao(local);
    setFeedback(null);
    if (local && origem !== "mapa") {
      setCentroMapa([local.latitude, local.longitude]);
    }
  }

  function selecionarPontoNoMapa(latitude, longitude) {
    selecionarLocalizacao(
      {
        endereco: "Ponto selecionado no mapa",
        latitude,
        longitude,
      },
      "mapa",
    );
  }

  function capturarLocalizacao() {
    if (!navigator.geolocation) {
      setFeedback({
        tipo: "error",
        mensagem: "Este navegador não disponibiliza geolocalização.",
      });
      return;
    }

    setFeedback({ tipo: "info", mensagem: "Obtendo sua localização..." });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selecionarLocalizacao({
          endereco: "Minha localização atual",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setFeedback({
          tipo: "success",
          mensagem: "Sua localização atual foi selecionada.",
        });
      },
      (error) => {
        const mensagem =
          error.code === error.PERMISSION_DENIED
            ? "Permita o acesso à localização ou busque um endereço."
            : "Não foi possível obter sua localização. Busque um endereço.";
        setFeedback({ tipo: "error", mensagem });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(null);

    if (!localizacao) {
      setFeedback({
        tipo: "error",
        mensagem: "Marque um ponto no mapa, selecione um endereço ou use o GPS.",
      });
      return;
    }

    setEnviando(true);
    try {
      const resultado = await apiRequest("/ocorrencias", {
        method: "POST",
        body: {
          categoria,
          descricao: descricao.trim(),
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
        },
      });
      setFeedback({
        tipo: "success",
        mensagem: `Ocorrência #${resultado.ocorrencia_id} registrada. Você recebeu 15 pontos.`,
      });
      setDescricao("");
      onSucesso?.(resultado);
    } catch (error) {
      setFeedback({ tipo: "error", mensagem: error.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="panel content-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MAPEAMENTO COLABORATIVO</p>
          <h1>Registrar problema</h1>
          <p className="muted">
            Informe uma barreira de acessibilidade para ajudar outras pessoas.
          </p>
        </div>
      </div>

      <form className="stack-form report-form" onSubmit={handleSubmit}>
        <label>
          Tipo de obstáculo
          <select
            onChange={(event) => setCategoria(event.target.value)}
            value={categoria}
          >
            {CATEGORIAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Descrição e ponto de referência
          <textarea
            maxLength={2000}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Descreva o problema e indique um ponto de referência."
            required
            rows={4}
            value={descricao}
          />
        </label>

        <div className="form-section">
          <strong>Onde está o problema?</strong>
          <p className="muted">
            Clique no mapa ou arraste o marcador para indicar o local. Se
            preferir, busque um endereço ou use o GPS.
          </p>
          <SeletorLocalizacao
            centro={centroMapa}
            localizacao={localizacao}
            onSelect={selecionarPontoNoMapa}
          />
          <BuscaEndereco
            id="endereco-ocorrencia"
            label="Endereço"
            onSelect={(local) => selecionarLocalizacao(local)}
            onUseGps={capturarLocalizacao}
            placeholder="Ex.: Rua da Aurora, Recife"
            value={localizacao}
          />
        </div>

        {feedback && (
          <div
            className={`notice notice-${feedback.tipo}`}
            role={feedback.tipo === "error" ? "alert" : "status"}
          >
            {feedback.mensagem}
          </div>
        )}

        <button className="button button-primary" disabled={enviando}>
          {enviando ? "Enviando ocorrência..." : "Registrar ocorrência"}
        </button>
      </form>
    </section>
  );
}
