import React, { useCallback, useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BuscaEndereco from "./BuscaEndereco";
import { apiRequest } from "../services/api";

const POSICAO_RECIFE = [-8.05428, -34.8813];

function criarIconeStatus(status) {
  const cores = {
    Confirmado: "#00A86B",
    "Em Validação": "#FF7A00",
    Pendente: "#0B3D91",
    Resolvido: "#4A5568",
  };
  const cor = cores[status] || "#0B3D91";
  return L.divIcon({
    className: "custom-pin",
    html: `<span aria-label="Status: ${status}" style="display:block;background:${cor};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px #0006"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function MapaColaborativo({
  modoRota = false,
  onPontosAtualizados,
  userId,
}) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [validandoIds, setValidandoIds] = useState(() => new Set());
  const [origem, setOrigem] = useState(null);
  const [destino, setDestino] = useState(null);
  const [perfil, setPerfil] = useState("cadeira_de_rodas");
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [rotaCoordenadas, setRotaCoordenadas] = useState([]);
  const [detalhesRota, setDetalhesRota] = useState(null);

  const buscarOcorrencias = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams({
        lat: String(POSICAO_RECIFE[0]),
        lon: String(POSICAO_RECIFE[1]),
        raio_metros: "30000",
        limite: "1000",
      });
      if (filtroStatus) params.set("status", filtroStatus);
      const resultado = await apiRequest(`/ocorrencias?${params.toString()}`);
      setOcorrencias(resultado.ocorrencias || []);
    } catch (error) {
      setErro(error.message);
      setOcorrencias([]);
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    buscarOcorrencias();
  }, [buscarOcorrencias]);

  async function validarOcorrencia(id) {
    if (validandoIds.has(id)) return;

    setValidandoIds((ids) => new Set(ids).add(id));
    setMensagem("");
    try {
      const resultado = await apiRequest(`/ocorrencias/${id}/validar`, {
        method: "POST",
      });
      setOcorrencias((atuais) =>
        atuais.map((ocorrencia) =>
          ocorrencia.id === id
            ? { ...ocorrencia, validada_por_mim: true }
            : ocorrencia,
        ),
      );
      setMensagem(
        `Confirmação validada. Confiança atual: ${resultado.novo_ico}%. Você recebeu 5 pontos.`,
      );
      onPontosAtualizados?.(resultado.pontos_usuario);
      await buscarOcorrencias();
    } catch (error) {
      setMensagem(error.message);
    } finally {
      setValidandoIds((ids) => {
        const novosIds = new Set(ids);
        novosIds.delete(id);
        return novosIds;
      });
    }
  }

  function capturarOrigem() {
    if (!navigator.geolocation) {
      setErro("Este navegador não disponibiliza geolocalização.");
      return;
    }
    setErro("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigem({
          endereco: "Minha localização atual",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      () => setErro("Não foi possível obter o GPS. Busque um endereço de origem."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function calcularRota(event) {
    event.preventDefault();
    setErro("");
    if (!origem || !destino) {
      setErro("Busque e selecione os endereços de origem e destino.");
      return;
    }

    setCalculandoRota(true);
    try {
      const resultado = await apiRequest("/rotas/calcular", {
        method: "POST",
        body: {
          origem_lat: origem.latitude,
          origem_lon: origem.longitude,
          destino_lat: destino.latitude,
          destino_lon: destino.longitude,
          perfil,
        },
      });
      setRotaCoordenadas(
        resultado.geometria.coordinates.map(([lon, lat]) => [lat, lon]),
      );
      setDetalhesRota({
        ...resultado,
        origem: origem.endereco,
        destino: destino.endereco,
      });
    } catch (error) {
      setErro(error.message);
      setDetalhesRota(null);
      setRotaCoordenadas([]);
    } finally {
      setCalculandoRota(false);
    }
  }

  return (
    <section className="map-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RECIFE · PERNAMBUCO</p>
          <h1>{modoRota ? "Rotas acessíveis" : "Mapa colaborativo"}</h1>
          <p className="muted">
            Ocorrências reais reportadas pela comunidade.
          </p>
        </div>
        <button
          className="button button-secondary"
          disabled={carregando}
          onClick={buscarOcorrencias}
          type="button"
        >
          Atualizar mapa
        </button>
      </div>

      {modoRota && (
        <form className="panel route-form" onSubmit={calcularRota}>
          <div className="form-section-heading">
            <div>
              <strong>Planejar trajeto</strong>
              <p className="muted">
                Busque os endereços de origem e destino. O traçado considera
                os obstáculos confirmados no mapa.
              </p>
            </div>
          </div>
          <div className="form-grid route-coordinates">
            <BuscaEndereco
              id="endereco-origem"
              label="Origem"
              onSelect={setOrigem}
              onUseGps={capturarOrigem}
              placeholder="Ex.: Marco Zero, Recife"
              value={origem}
            />
            <BuscaEndereco
              id="endereco-destino"
              label="Destino"
              onSelect={setDestino}
              placeholder="Ex.: Parque da Jaqueira, Recife"
              value={destino}
            />
          </div>
          <div className="route-actions">
            <label>
              Perfil de mobilidade
              <select
                onChange={(event) => setPerfil(event.target.value)}
                value={perfil}
              >
                <option value="cadeira_de_rodas">Cadeira de rodas</option>
                <option value="pe_lento">Pessoa com mobilidade reduzida</option>
                <option value="geral">Geral</option>
              </select>
            </label>
            <button
              className="button button-primary"
              disabled={calculandoRota}
              type="submit"
            >
              {calculandoRota ? "Calculando..." : "Calcular rota"}
            </button>
          </div>
        </form>
      )}

      <div className="panel map-toolbar">
        <label>
          Situação
          <select
            onChange={(event) => setFiltroStatus(event.target.value)}
            value={filtroStatus}
          >
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Em Validação">Em Validação</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Resolvido">Resolvido</option>
          </select>
        </label>
        <span className="muted" aria-live="polite">
          {carregando
            ? "Carregando ocorrências..."
            : `${ocorrencias.length} ocorrências no mapa`}
        </span>
      </div>

      {erro && (
        <div className="notice notice-error" role="alert">
          {erro}
        </div>
      )}
      {mensagem && (
        <div className="notice notice-info" role="status">
          {mensagem}
        </div>
      )}
      {detalhesRota && (
        <div className="notice notice-info route-result">
          <strong>Rota calculada</strong>
          <span>
            De {detalhesRota.origem} até {detalhesRota.destino}
          </span>
          <span>
            {(detalhesRota.distancia_metros / 1000).toFixed(2)} km ·{" "}
            {detalhesRota.tempo_estimado_minutos} min estimados
          </span>
          <span>
            {detalhesRota.obstaculos_proximos} obstáculos próximos · segurança{" "}
            {detalhesRota.avaliar_seguranca}
          </span>
          <small>
            Rota a pé fornecida pelo OSRM; não substitui avaliação presencial
            das condições de acessibilidade.
          </small>
        </div>
      )}

      <div className="map-frame">
        <MapContainer
          center={POSICAO_RECIFE}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          zoom={13}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {rotaCoordenadas.length > 0 && (
            <Polyline
              pathOptions={{
                color:
                  detalhesRota?.obstaculos_proximos > 0
                    ? "#E53E3E"
                    : "#00A86B",
                weight: 6,
              }}
              positions={rotaCoordenadas}
            />
          )}
          {ocorrencias.map((ocorrencia) => (
            <Marker
              icon={criarIconeStatus(ocorrencia.status)}
              key={ocorrencia.id}
              position={[ocorrencia.latitude, ocorrencia.longitude]}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{ocorrencia.categoria}</strong>
                  <p>{ocorrencia.descricao || "Sem descrição."}</p>
                  <span>
                    {ocorrencia.status} · Confiança {ocorrencia.ico}% · IPA{" "}
                    {ocorrencia.ipa}
                  </span>
                  {ocorrencia.validada_por_mim && (
                    <p className="muted" role="status">
                      irregularidade validada por você.
                    </p>
                  )}
                  {ocorrencia.usuario_id !== userId &&
                    !ocorrencia.validada_por_mim &&
                    ocorrencia.status !== "Resolvido" && (
                    <button
                      className="button button-primary"
                      onClick={() => validarOcorrencia(ocorrencia.id)}
                      disabled={validandoIds.has(ocorrencia.id)}
                      type="button"
                    >
                      {validandoIds.has(ocorrencia.id)
                        ? "Enviando confirmação..."
                        : "Confirmar ocorrência (+5 pontos)"}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
