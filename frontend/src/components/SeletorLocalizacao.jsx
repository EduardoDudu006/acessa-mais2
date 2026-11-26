import React, { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const POSICAO_RECIFE = [-8.05428, -34.8813];

const iconePontoSelecionado = L.divIcon({
  className: "location-picker-marker",
  html: "<span></span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function CapturarCliqueMapa({ onSelect }) {
  useMapEvents({
    click({ latlng }) {
      onSelect(latlng.lat, latlng.lng);
    },
  });
  return null;
}

function CentralizarMapa({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 16));
  }, [map, position]);

  return null;
}

function ObservarRedimensionamentoMapa() {
  const map = useMap();

  useEffect(() => {
    const atualizarTamanho = () => map.invalidateSize({ pan: false });
    const frame = window.requestAnimationFrame(atualizarTamanho);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(atualizarTamanho);

    observer?.observe(map.getContainer());

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

export default function SeletorLocalizacao({
  localizacao,
  onSelect,
  centro,
  zoomAnimation = true,
}) {
  function moverMarcador(event) {
    const { lat, lng } = event.target.getLatLng();
    onSelect(lat, lng);
  }

  return (
    <div className="location-picker-map">
      <MapContainer
        center={POSICAO_RECIFE}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        zoomAnimation={zoomAnimation}
        zoom={13}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ObservarRedimensionamentoMapa />
        <CapturarCliqueMapa
          onSelect={(latitude, longitude) =>
            onSelect(latitude, longitude, "mapa")
          }
        />
        <CentralizarMapa position={centro} />
        {localizacao && (
          <Marker
            draggable
            eventHandlers={{ dragend: moverMarcador }}
            icon={iconePontoSelecionado}
            position={[localizacao.latitude, localizacao.longitude]}
          />
        )}
      </MapContainer>
    </div>
  );
}
