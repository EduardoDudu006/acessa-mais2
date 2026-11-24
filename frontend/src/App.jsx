import React, { useCallback, useEffect, useState } from "react";
import logoSidebar from "../assets/logo-acessa-mais.png";
import Autenticacao from "./components/Autenticacao";
import FormularioOcorrencia from "./components/FormularioOcorrencia";
import MapaColaborativo from "./components/MapaColaborativo";
import { apiRequest, getApiBase } from "./services/api";
import "./App.css";

const MENU_ITEMS = [
  ["Início", "⌂"],
  ["Mapa", "◎"],
  ["Registrar problema", "+"],
  ["Rotas acessíveis", "↗"],
  ["Ocorrências", "▤"],
  ["Estatísticas", "▥"],
  ["Gamificação", "★"],
  ["Perfil", "◉"],
  ["Configurações", "⚙"],
];

const MOBILE_PRIMARY_ITEMS = [
  ["Início", "⌂", "Início"],
  ["Mapa", "◎", "Mapa"],
  ["Registrar problema", "+", "Registrar"],
  ["Rotas acessíveis", "↗", "Rotas"],
];
const MOBILE_MORE_ITEMS = MENU_ITEMS.filter(
  ([item]) => !MOBILE_PRIMARY_ITEMS.some(([principal]) => principal === item),
);

function lerSessaoSalva() {
  const token = window.localStorage.getItem("acessa_token");
  const usuarioSalvo = window.localStorage.getItem("acessa_usuario");
  if (!token || !usuarioSalvo) return null;
  try {
    return { token, user: JSON.parse(usuarioSalvo) };
  } catch {
    window.localStorage.removeItem("acessa_token");
    window.localStorage.removeItem("acessa_usuario");
    return null;
  }
}

export default function App() {
  const [sessao, setSessao] = useState(lerSessaoSalva);
  const [validandoSessao, setValidandoSessao] = useState(
    () => Boolean(window.localStorage.getItem("acessa_token")),
  );
  const [abaAtiva, setAbaAtiva] = useState("Início");
  const [maisMenuAberto, setMaisMenuAberto] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [erroPainel, setErroPainel] = useState("");
  const [carregandoPainel, setCarregandoPainel] = useState(false);
  const [estadoApi, setEstadoApi] = useState("unknown");

  const sair = useCallback(() => {
    window.localStorage.removeItem("acessa_token");
    window.localStorage.removeItem("acessa_usuario");
    setSessao(null);
    setMaisMenuAberto(false);
    setResumo(null);
    setOcorrencias([]);
    setRanking([]);
    setAbaAtiva("Início");
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("acessa_token");
    if (!token) {
      setValidandoSessao(false);
      return;
    }

    apiRequest("/auth/me")
      .then((user) => {
        window.localStorage.setItem("acessa_usuario", JSON.stringify(user));
        setSessao({ token, user });
      })
      .catch((error) => {
        if (error.status === 401) sair();
      })
      .finally(() => setValidandoSessao(false));
  }, [sair]);

  const carregarDados = useCallback(async () => {
    if (!sessao?.token) return;
    setCarregandoPainel(true);
    setErroPainel("");
    const resultados = await Promise.allSettled([
      apiRequest("/ocorrencias/resumo"),
      apiRequest("/ocorrencias?limite=1000"),
      apiRequest("/auth/ranking"),
      apiRequest("/auth/me"),
    ]);

    const falha = resultados.find((resultado) => resultado.status === "rejected");
    if (falha) setErroPainel(falha.reason.message);
    if (resultados[0].status === "fulfilled") {
      setResumo(resultados[0].value);
    }
    if (resultados[1].status === "fulfilled") {
      setOcorrencias(resultados[1].value.ocorrencias || []);
    }
    if (resultados[2].status === "fulfilled") {
      setRanking(resultados[2].value.usuarios || []);
    }
    if (resultados[3].status === "fulfilled") {
      const user = resultados[3].value;
      window.localStorage.setItem("acessa_usuario", JSON.stringify(user));
      setSessao((atual) => (atual ? { ...atual, user } : atual));
    }
    setCarregandoPainel(false);
  }, [sessao?.token]);

  useEffect(() => {
    if (sessao?.token) carregarDados();
  }, [sessao?.token, carregarDados]);

  function entrar(novaSessao) {
    window.localStorage.setItem("acessa_token", novaSessao.token);
    window.localStorage.setItem(
      "acessa_usuario",
      JSON.stringify(novaSessao.user),
    );
    setSessao(novaSessao);
  }

  async function verificarApi() {
    setEstadoApi("checking");
    try {
      await apiRequest("/health");
      setEstadoApi("online");
    } catch (error) {
      setEstadoApi(error.message);
    }
  }

  if (validandoSessao) {
    return <main className="loading-screen">Verificando sua sessão...</main>;
  }
  if (!sessao?.token) return <Autenticacao onLogin={entrar} />;

  const nome = sessao.user?.nome || "Pessoa colaboradora";
  const pontos = Number(sessao.user?.pontos || 0);
  const nivel =
    pontos >= 500
      ? "Guardião da Mobilidade"
      : pontos >= 150
        ? "Colaborador"
        : "Explorador";
  const ocorrenciasUsuario = ocorrencias.filter(
    (ocorrencia) => ocorrencia.usuario_id === sessao.user?.id,
  );
  const maisAtivo = MOBILE_MORE_ITEMS.some(([item]) => item === abaAtiva);

  function navegarPara(aba) {
    setAbaAtiva(aba);
    setMaisMenuAberto(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <img className="sidebar-logo" src={logoSidebar} alt="ACESSA+" />
          <nav
            aria-label="Navegação principal"
            className="main-nav desktop-nav"
          >
            {MENU_ITEMS.map(([item, icon]) => (
              <button
                aria-current={abaAtiva === item ? "page" : undefined}
                className={`nav-item ${abaAtiva === item ? "active" : ""}`}
                key={item}
                onClick={() => navegarPara(item)}
                type="button"
              >
                <span aria-hidden="true" className="nav-icon">
                  {icon}
                </span>
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{nome.slice(0, 1).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <strong>{nome}</strong>
            <span>{nivel}</span>
            <span>{pontos} pontos</span>
          </div>
          <button
            className="sidebar-logout"
            onClick={sair}
            title="Encerrar sessão"
            type="button"
          >
            <span aria-hidden="true">↪</span>
            Sair
          </button>
        </div>
      </aside>

      <nav aria-label="Navegação principal" className="mobile-nav">
        {MOBILE_PRIMARY_ITEMS.map(([item, icon, label]) => (
          <button
            aria-current={abaAtiva === item ? "page" : undefined}
            aria-label={item}
            className={`nav-item ${abaAtiva === item ? "active" : ""}`}
            key={item}
            onClick={() => navegarPara(item)}
            type="button"
          >
            <span aria-hidden="true" className="nav-icon">
              {icon}
            </span>
            <span className="mobile-nav-label">{label}</span>
          </button>
        ))}
        <button
          aria-controls={maisMenuAberto ? "mobile-more-menu" : undefined}
          aria-expanded={maisMenuAberto}
          className={`nav-item ${maisAtivo ? "active" : ""}`}
          onClick={() => setMaisMenuAberto((aberto) => !aberto)}
          type="button"
        >
          <span aria-hidden="true" className="nav-icon">
            •••
          </span>
          <span className="mobile-nav-label">Mais</span>
        </button>
      </nav>

      {maisMenuAberto && (
        <>
          <button
            aria-label="Fechar menu Mais"
            className="mobile-menu-backdrop"
            onClick={() => setMaisMenuAberto(false)}
            type="button"
          />
          <nav
            aria-label="Mais opções"
            className="mobile-more-menu"
            id="mobile-more-menu"
          >
            {MOBILE_MORE_ITEMS.map(([item, icon]) => (
              <button
                aria-current={abaAtiva === item ? "page" : undefined}
                className={`mobile-more-item ${
                  abaAtiva === item ? "active" : ""
                }`}
                key={item}
                onClick={() => navegarPara(item)}
                type="button"
              >
                <span aria-hidden="true">{icon}</span>
                {item}
              </button>
            ))}
            <button
              className="mobile-more-item mobile-more-logout"
              onClick={sair}
              type="button"
            >
              <span aria-hidden="true">↪</span>
              Sair
            </button>
          </nav>
        </>
      )}

      <div className="app-main">
        <header className="topbar">
          <div>
            <span className="topbar-eyebrow">ACESSIBILIDADE URBANA</span>
            <strong>{abaAtiva}</strong>
          </div>
          <div className="topbar-actions">
            <span className="connection-indicator">
              <span className="status-dot" />
              Dados conectados à API
            </span>
          </div>
        </header>

        <main className="page-content">
          {erroPainel && (
            <div className="notice notice-error" role="alert">
              {erroPainel}
              <button
                className="inline-button"
                onClick={carregarDados}
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {abaAtiva === "Início" && (
            <Dashboard
              carregando={carregandoPainel}
              nome={nome}
              ocorrencias={ocorrencias}
              onNavigate={navegarPara}
              onRefresh={carregarDados}
              resumo={resumo}
            />
          )}
          {abaAtiva === "Mapa" && (
            <MapaColaborativo
              onPontosAtualizados={carregarDados}
              userId={sessao.user?.id}
            />
          )}
          {abaAtiva === "Registrar problema" && (
            <FormularioOcorrencia onSucesso={carregarDados} />
          )}
          {abaAtiva === "Rotas acessíveis" && (
            <MapaColaborativo
              modoRota
              onPontosAtualizados={carregarDados}
              userId={sessao.user?.id}
            />
          )}
          {abaAtiva === "Ocorrências" && (
            <ListaOcorrencias
              carregando={carregandoPainel}
              ocorrencias={ocorrencias}
              onRefresh={carregarDados}
            />
          )}
          {abaAtiva === "Estatísticas" && (
            <Estatisticas carregando={carregandoPainel} resumo={resumo} />
          )}
          {abaAtiva === "Gamificação" && (
            <Gamificacao
              nomeUsuario={nome}
              pontos={pontos}
              ranking={ranking}
              userId={sessao.user?.id}
            />
          )}
          {abaAtiva === "Perfil" && (
            <Perfil
              ocorrencias={ocorrenciasUsuario}
              user={sessao.user}
              nivel={nivel}
            />
          )}
          {abaAtiva === "Configurações" && (
            <Configuracoes
              estadoApi={estadoApi}
              onCheck={verificarApi}
              sair={sair}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ nome, resumo, ocorrencias, carregando, onNavigate, onRefresh }) {
  const porStatus = resumo?.por_status || {};
  const recentes = ocorrencias.slice(0, 5);

  return (
    <div className="page-stack">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">RECIFE MAIS ACESSÍVEL</p>
          <h1>Olá, {nome.split(" ")[0]}.</h1>
          <p>
            Consulte barreiras reportadas e contribua com informações da sua
            região.
          </p>
        </div>
        <button
          className="button button-light"
          onClick={() => onNavigate("Registrar problema")}
          type="button"
        >
          + Registrar ocorrência
        </button>
      </section>

      <section aria-label="Resumo das ocorrências" className="stat-grid">
        <StatCard
          label="Ocorrências mapeadas"
          value={resumo?.total ?? (carregando ? "…" : "—")}
          tone="blue"
        />
        <StatCard
          label="Pendentes"
          value={porStatus.Pendente ?? (carregando ? "…" : 0)}
          tone="orange"
        />
        <StatCard
          label="Em validação"
          value={porStatus["Em Validação"] ?? (carregando ? "…" : 0)}
          tone="purple"
        />
        <StatCard
          label="Confirmadas"
          value={porStatus.Confirmado ?? (carregando ? "…" : 0)}
          tone="green"
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ocorrências recentes</h2>
            <p className="muted">Atualizadas a partir do banco de dados.</p>
          </div>
          <div className="panel-actions">
            <button
              className="button button-secondary"
              disabled={carregando}
              onClick={onRefresh}
              type="button"
            >
              Atualizar
            </button>
            <button
              className="text-button"
              onClick={() => onNavigate("Ocorrências")}
              type="button"
            >
              Ver todas
            </button>
          </div>
        </div>
        <TabelaOcorrencias
          carregando={carregando}
          ocorrencias={recentes}
          vazio="Ainda não há ocorrências registradas."
        />
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ListaOcorrencias({ ocorrencias, carregando, onRefresh }) {
  const [filtro, setFiltro] = useState("");
  const filtradas = ocorrencias.filter(
    (ocorrencia) => !filtro || ocorrencia.status === filtro,
  );
  return (
    <section className="panel content-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DADOS DA COMUNIDADE</p>
          <h1>Ocorrências</h1>
          <p className="muted">
            {ocorrencias.length} registros carregados da API.
          </p>
        </div>
        <div className="panel-actions">
          <label className="compact-label">
            Status
            <select
              onChange={(event) => setFiltro(event.target.value)}
              value={filtro}
            >
              <option value="">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Validação">Em validação</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Resolvido">Resolvido</option>
            </select>
          </label>
          <button
            className="button button-secondary"
            disabled={carregando}
            onClick={onRefresh}
            type="button"
          >
            Atualizar
          </button>
        </div>
      </div>
      <TabelaOcorrencias
        carregando={carregando}
        ocorrencias={filtradas}
        vazio="Não há ocorrências para este filtro."
      />
    </section>
  );
}

function TabelaOcorrencias({ ocorrencias, carregando, vazio }) {
  if (carregando && ocorrencias.length === 0) {
    return <p className="empty-state">Carregando dados da API...</p>;
  }
  if (ocorrencias.length === 0) {
    return <p className="empty-state">{vazio}</p>;
  }

  const linhas = ocorrencias.map((ocorrencia) => ({
    ...ocorrencia,
    descricao: ocorrencia.descricao || "Sem descrição",
    classeStatus: `status-pill status-${ocorrencia.status
      .toLowerCase()
      .replaceAll(" ", "-")}`,
    data: ocorrencia.criado_em
      ? new Date(ocorrencia.criado_em).toLocaleDateString("pt-BR")
      : "—",
  }));

  return (
    <>
      <ul aria-label="Lista de ocorrências" className="mobile-occurrence-list">
        {linhas.map((linha) => (
          <li className="mobile-occurrence-card" key={linha.id}>
            <div className="mobile-occurrence-main">
              <strong>{linha.categoria}</strong>
              <p>{linha.descricao}</p>
            </div>
            <dl className="mobile-occurrence-meta">
              <div>
                <dt>Situação</dt>
                <dd>
                  <span className={linha.classeStatus}>{linha.status}</span>
                </dd>
              </div>
              <div>
                <dt>Prioridade</dt>
                <dd>{linha.ipa}/10</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>{linha.data}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="table-scroll desktop-occurrence-table">
        <table>
          <thead>
            <tr>
              <th>Problema</th>
              <th>Situação</th>
              <th>Prioridade</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.id}>
                <td>
                  <strong>{linha.categoria}</strong>
                  <span className="table-description">{linha.descricao}</span>
                </td>
                <td>
                  <span className={linha.classeStatus}>{linha.status}</span>
                </td>
                <td>{linha.ipa}/10</td>
                <td>{linha.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Estatisticas({ resumo, carregando }) {
  const total = resumo?.total || 0;
  const categorias = resumo?.por_categoria || [];
  return (
    <div className="page-stack">
      <section className="section-heading">
        <div>
          <p className="eyebrow">DADOS ATUALIZADOS</p>
          <h1>Estatísticas</h1>
          <p className="muted">
            Totais calculados a partir das ocorrências armazenadas.
          </p>
        </div>
      </section>
      {carregando && !resumo ? (
        <p className="empty-state">Carregando estatísticas...</p>
      ) : (
        <>
          <section className="stat-grid">
            <StatCard label="Total" value={total} tone="blue" />
            {Object.entries(resumo?.por_status || {}).map(
              ([status, quantidade], index) => (
                <StatCard
                  key={status}
                  label={status}
                  value={quantidade}
                  tone={["orange", "purple", "green", "blue"][index % 4]}
                />
              ),
            )}
          </section>
          <section className="panel content-panel">
            <h2>Ocorrências por categoria</h2>
            {categorias.length === 0 ? (
              <p className="empty-state">Ainda não há dados para exibir.</p>
            ) : (
              <div className="category-list">
                {categorias.map((item) => (
                  <div className="category-row" key={item.categoria}>
                    <span>{item.categoria}</span>
                    <strong>{item.quantidade}</strong>
                    <div className="bar-track">
                      <span
                        style={{
                          width: `${total ? (item.quantidade / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Gamificacao({ ranking, userId, nomeUsuario, pontos }) {
  return (
    <div className="page-stack">
      <section className="welcome-panel gamification-panel">
        <div>
          <p className="eyebrow">CONTRIBUIÇÃO COMUNITÁRIA</p>
          <h1>Pontos e reconhecimento</h1>
          <p>
            Ganhe 15 pontos ao registrar uma ocorrência e 5 ao validar uma
            ocorrência de outra pessoa.
          </p>
        </div>
        <div className="score-block">
          <strong>{pontos}</strong>
          <span>seus pontos</span>
        </div>
      </section>
      <section className="panel content-panel">
        <h2>Ranking da comunidade</h2>
        {ranking.length === 0 ? (
          <p className="empty-state">Ainda não há participantes no ranking.</p>
        ) : (
          <ol className="ranking-list">
            {ranking.map((usuario, index) => (
              <li
                className={usuario.id === userId ? "ranking-current" : ""}
                key={usuario.id}
              >
                <span className="ranking-position">{index + 1}</span>
                <span className="ranking-name">
                  {usuario.nome}
                  {usuario.id === userId && (
                    <small>Você ({nomeUsuario})</small>
                  )}
                </span>
                <strong>{usuario.pontos} pts</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Perfil({ user, ocorrencias, nivel }) {
  return (
    <section className="panel content-panel profile-panel">
      <p className="eyebrow">SUA CONTA</p>
      <h1>Perfil</h1>
      <div className="profile-details">
        <div>
          <span>Nome</span>
          <strong>{user?.nome}</strong>
        </div>
        <div>
          <span>E-mail</span>
          <strong>{user?.email}</strong>
        </div>
        <div>
          <span>Nível</span>
          <strong>{nivel}</strong>
        </div>
        <div>
          <span>Ocorrências registradas</span>
          <strong>{ocorrencias.length}</strong>
        </div>
        <div>
          <span>Pontos</span>
          <strong>{user?.pontos || 0}</strong>
        </div>
      </div>
    </section>
  );
}

function Configuracoes({ estadoApi, onCheck, sair }) {
  return (
    <section className="panel content-panel">
      <p className="eyebrow">APLICAÇÃO</p>
      <h1>Configurações</h1>
      <div className="settings-list">
        <div>
          <strong>Endereço da API</strong>
          <code>{getApiBase()}</code>
          <p className="muted">
            Configure VITE_API_URL no ambiente do frontend para alterar o
            servidor.
          </p>
        </div>
        <div>
          <strong>Conexão com o servidor</strong>
          <span>
            {estadoApi === "online"
              ? "API online"
              : estadoApi === "checking"
                ? "Verificando..."
                : estadoApi === "unknown"
                  ? "Ainda não verificada"
                  : estadoApi}
          </span>
          <button
            className="button button-secondary"
            disabled={estadoApi === "checking"}
            onClick={onCheck}
            type="button"
          >
            Testar conexão
          </button>
        </div>
        <div>
          <strong>Sessão</strong>
          <span>Encerre sua sessão neste dispositivo.</span>
          <button className="button button-danger" onClick={sair} type="button">
            Sair da conta
          </button>
        </div>
      </div>
    </section>
  );
}
