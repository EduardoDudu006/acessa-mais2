import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

export default function BuscaEndereco({
  id,
  label,
  placeholder = "Ex.: Rua da Aurora, Recife",
  value,
  onSelect,
  onUseGps,
}) {
  const [consulta, setConsulta] = useState(value?.endereco || "");
  const [resultados, setResultados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (value?.endereco && value.endereco !== consulta) {
      setConsulta(value.endereco);
      setResultados([]);
      setErro("");
    }
  }, [consulta, value?.endereco]);

  async function buscar(event) {
    event?.preventDefault();
    const endereco = consulta.trim();
    if (endereco.length < 3) {
      setErro("Digite pelo menos 3 caracteres para buscar.");
      setResultados([]);
      return;
    }

    setCarregando(true);
    setErro("");
    setResultados([]);
    try {
      const resultado = await apiRequest(
        `/localizacoes/buscar?endereco=${encodeURIComponent(endereco)}`,
      );
      setResultados(resultado.resultados || []);
      if (!resultado.resultados?.length) {
        setErro("Nenhum endereço encontrado. Tente incluir bairro e cidade.");
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  function alterarConsulta(event) {
    setConsulta(event.target.value);
    setResultados([]);
    setErro("");
    onSelect(null);
  }

  function selecionar(resultado) {
    setConsulta(resultado.endereco);
    setResultados([]);
    setErro("");
    onSelect(resultado);
  }

  return (
    <div className="address-field">
      <label htmlFor={id}>{label}</label>
      <div className="address-search-row">
        <input
          autoComplete="off"
          id={id}
          onChange={alterarConsulta}
          onKeyDown={(event) => {
            if (event.key === "Enter") buscar(event);
          }}
          placeholder={placeholder}
          type="search"
          value={consulta}
        />
        <button
          className="button button-secondary"
          disabled={carregando}
          onClick={buscar}
          type="button"
        >
          {carregando ? "Buscando..." : "Buscar"}
        </button>
        {onUseGps && (
          <button
            className="button button-secondary gps-button"
            onClick={onUseGps}
            type="button"
          >
            Usar GPS
          </button>
        )}
      </div>

      {value?.endereco && (
        <p className="selected-address" role="status">
          Local selecionado: {value.endereco}
        </p>
      )}

      {erro && (
        <p className="address-error" role="alert">
          {erro}
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="address-results" aria-label="Resultados de endereço">
          {resultados.map((resultado) => (
            <li key={resultado.id}>
              <button
                onClick={() => selecionar(resultado)}
                type="button"
              >
                {resultado.endereco}
              </button>
            </li>
          ))}
        </ul>
      )}

      <small className="address-attribution">
        O endereço digitado será consultado no serviço de{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          rel="noreferrer"
          target="_blank"
        >
          OpenStreetMap
        </a>
        .
      </small>
    </div>
  );
}
