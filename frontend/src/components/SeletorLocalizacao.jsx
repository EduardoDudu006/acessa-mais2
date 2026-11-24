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

export default function SeletorLocalizacao({
  localizacao,
  onSelect,
  centro,
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
        zoom={13}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
