import React, { useState } from "react";
import logoSidebar from "./assets/logo-acessa-mais.png";
import FormularioOcorrencia from "./components/FormularioOcorrencia";
import MapaColaborativo from "./components/MapaColaborativo";

const MENU_ITEMS = [
  "Início",
  "Mapa",
  "Registrar Problema",
  "Rotas Acessíveis",
  "Ocorrências",
  "Estatísticas",
  "Gamificação",
  "Perfil",
  "Configurações",
];

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState("Início");
  const [buscaDestino, setBuscaDestino] = useState("");
  const [pontosUsuario, setPontosUsuario] = useState(320);
  const usuarioId = 1;

  const nivelUsuario =
    pontosUsuario >= 500
      ? "Guardião da Mobilidade"
      : pontosUsuario >= 150
      ? "Colaborador"
      : "Explorador";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#F4F6F9",
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR ESQUERDO */}
      <aside
        style={{
          width: "260px",
          backgroundColor: "#072B68",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 16px",
        }}
      >
        <div>
          <div style={{ marginBottom: "32px", paddingLeft: "8px" }}>
            <img
              src={logoSidebar}
              alt="ACESSA+"
              style={{ width: "160px", height: "auto", objectFit: "contain" }}
            />
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {MENU_ITEMS.map((item) => (
              <NavItem
                key={item}
                label={item}
                ativo={abaAtiva === item}
                onClick={() => setAbaAtiva(item)}
              />
            ))}
          </nav>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              backgroundColor: "#FF7A00",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            EL
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700" }}>
              Eduardo Luz
            </div>
            <div style={{ fontSize: "11px", color: "#A0AEC0" }}>
              Nível: {nivelUsuario}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#FF7A00",
                fontWeight: "600",
                marginTop: "2px",
              }}
            >
              {pontosUsuario} pontos
            </div>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            height: "70px",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#F7FAFC",
              borderRadius: "20px",
              padding: "8px 16px",
              width: "350px",
              border: "1px solid #E2E8F0",
            }}
          >
            <span style={{ color: "#A0AEC0", marginRight: "10px" }}>🔍</span>
            <input
              type="text"
              value={buscaDestino}
              onChange={(e) => setBuscaDestino(e.target.value)}
              placeholder="Para onde você quer ir?"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: "13px",
                color: "#2D3748",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ position: "relative", cursor: "pointer" }}>
              <span style={{ fontSize: "18px" }}>🔔</span>
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  backgroundColor: "#E53E3E",
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: "bold",
                  padding: "2px 5px",
                  borderRadius: "50%",
                }}
              >
                3
              </span>
            </div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#0B3D91",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              EL
            </div>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            gap: "20px",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          {abaAtiva === "Registrar Problema" ? (
            <div style={{ flex: 1 }}>
              <FormularioOcorrencia
                usuarioId={usuarioId}
                onSucesso={() => {
                  setPontosUsuario((prev) => prev + 15);
                  setAbaAtiva("Mapa");
                }}
              />
            </div>
          ) : abaAtiva === "Mapa" || abaAtiva === "Rotas Acessíveis" ? (
            <div style={{ flex: 1 }}>
              <MapaColaborativo
                usuarioId={usuarioId}
                onPontosAtualizados={(novosPontos) =>
                  setPontosUsuario(novosPontos)
                }
              />
            </div>
          ) : (
            <>
              <div
                style={{
                  flex: 2.2,
                  backgroundColor: "#E2E8F0",
                  borderRadius: "16px",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #CBD5E0",
                  minHeight: "420px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.6,
                    background:
                      "radial-gradient(circle, #CBD5E0 10%, #A0AEC0 90%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "24px",
                    left: "24px",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "14px",
                    padding: "16px",
                    width: "320px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                    zIndex: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "70px",
                        height: "70px",
                        backgroundColor: "#94A3B8",
                        borderRadius: "8px",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#1A202C",
                          }}
                        >
                          Desnível na calçada
                        </h4>
                        <span
                          style={{
                            backgroundColor: "#FED7D7",
                            color: "#C53030",
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          Alta
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#718096",
                          margin: "2px 0 6px 0",
                        }}
                      >
                        Calçada
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#4A5568",
                          margin: 0,
                          lineHeight: "1.3",
                        }}
                      >
                        Desnível severo na calçada em frente ao comércio.
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#2F855A",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    ✓ Confirmado por 8 pessoas
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva("Mapa")}
                    style={{
                      width: "100%",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "10px",
                      backgroundColor: "#072B68",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer",
                      marginTop: "10px",
                    }}
                  >
                    Ver detalhes no mapa
                  </button>
                </div>
              </div>

              <div
                style={{
                  flex: 1.2,
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: "16px",
                    borderRadius: "14px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        fontWeight: "800",
                        color: "#1A202C",
                      }}
                    >
                      Resumo da Cidade
                    </h3>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#4A5568",
                        backgroundColor: "#EDF2F7",
                        padding: "4px 10px",
                        borderRadius: "8px",
                      }}
                    >
                      Recife PE
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <StatCard
                      value="1.452"
                      label="Total de ocorrências"
                      bg="#3182CE"
                    />
                    <StatCard value="987" label="Resolvidas" bg="#38A169" />
                    <StatCard value="465" label="Pendentes" bg="#DD6B20" />
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({ label, ativo, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "8px",
        border: "none",
        width: "100%",
        textAlign: "left",
        backgroundColor: ativo ? "rgba(255, 255, 255, 0.12)" : "transparent",
        color: ativo ? "#FFFFFF" : "#CBD5E0",
        fontWeight: ativo ? "700" : "500",
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
    </button>
  );
}

function StatCard({ value, label, bg }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: "10px",
        padding: "12px",
        color: "#FFFFFF",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: "900", marginBottom: "2px" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", opacity: 0.9, lineHeight: "1.2" }}>
        {label}
      </div>
    </div>
  );
}
