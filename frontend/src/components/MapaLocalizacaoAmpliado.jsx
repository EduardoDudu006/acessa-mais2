import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import BuscaEndereco from "./BuscaEndereco";
import SeletorLocalizacao from "./SeletorLocalizacao";

export default function MapaLocalizacaoAmpliado({
  centro,
  feedback,
  localizacao,
  onCancel,
  onConfirm,
  onSelect,
  onSelectAddress,
  onUseGps,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      if (dialog?.open) dialog.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  function cancelarSeFundoClicado(event) {
    if (event.target === event.currentTarget) onCancel();
  }

  return createPortal(
    <dialog
      aria-labelledby="location-picker-dialog-title"
      className="location-picker-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={cancelarSeFundoClicado}
      ref={dialogRef}
    >
      <div className="location-picker-dialog__content">
        <header className="location-picker-dialog__header">
          <div>
            <h2 id="location-picker-dialog-title">
              Selecione a localização
            </h2>
            <p className="muted">
              Clique no mapa ou arraste o marcador para ajustar o ponto.
            </p>
          </div>
          <button
            aria-label="Fechar mapa sem salvar"
            className="button button-secondary"
            onClick={onCancel}
            type="button"
          >
            Fechar
          </button>
        </header>

        <div className="location-picker-dialog__search">
          <BuscaEndereco
            id="endereco-ocorrencia-ampliado"
            label="Buscar endereço"
            onSelect={onSelectAddress}
            onUseGps={onUseGps}
            placeholder="Ex.: Rua da Aurora, Recife"
            value={localizacao}
          />
          {feedback && (
            <div
              className={`notice notice-${feedback.tipo}`}
              role={feedback.tipo === "error" ? "alert" : "status"}
            >
              {feedback.mensagem}
            </div>
          )}
        </div>

        <div className="location-picker-dialog__map">
          <SeletorLocalizacao
            centro={centro}
            localizacao={localizacao}
            onSelect={onSelect}
            zoomAnimation={false}
          />
        </div>

        <footer className="location-picker-dialog__footer">
          <p aria-live="polite" className="location-picker-dialog__coordinates">
            {localizacao
              ? `Latitude ${localizacao.latitude.toFixed(6)} · Longitude ${localizacao.longitude.toFixed(6)}`
              : "Escolha um ponto no mapa, busque um endereço ou use o GPS."}
          </p>
          <div className="location-picker-dialog__actions">
            <button
              className="button button-secondary"
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button button-location-confirm"
              disabled={!localizacao}
              onClick={onConfirm}
              type="button"
            >
              Confirmar localização
            </button>
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
