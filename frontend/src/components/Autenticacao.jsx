import React, { useState } from "react";
import { apiRequest } from "../services/api";
import logoCompleto from "../../assets/logo-completo.png";

export default function Autenticacao({ onLogin }) {
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      const resultado = await apiRequest(
        modoCadastro ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          token: null,
          body: modoCadastro
            ? { nome: nome.trim(), email: email.trim(), senha }
            : { email: email.trim(), senha },
        },
      );
      onLogin({
        token: resultado.access_token,
        user: resultado.usuario,
      });
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img
          className="auth-logo"
          src={logoCompleto}
          alt="ACESSA+"
        />
        <h1>{modoCadastro ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
        <p className="muted">
          Acesse o mapa colaborativo de acessibilidade de Recife.
        </p>

        <form className="stack-form" onSubmit={handleSubmit}>
          {modoCadastro && (
            <label>
              Nome
              <input
                autoComplete="name"
                maxLength={100}
                minLength={2}
                onChange={(event) => setNome(event.target.value)}
                required
                value={nome}
              />
            </label>
          )}
          <label>
            E-mail
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <div className="password-field">
            <label htmlFor="auth-password">Senha</label>
            <span className="password-input-wrapper">
              <input
                id="auth-password"
                autoComplete={modoCadastro ? "new-password" : "current-password"}
                minLength={modoCadastro ? 8 : 1}
                onChange={(event) => setSenha(event.target.value)}
                required
                type={senhaVisivel ? "text" : "password"}
                value={senha}
              />
              <button
                aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={senhaVisivel}
                className="password-visibility-toggle"
                onClick={() => setSenhaVisivel((visivel) => !visivel)}
                type="button"
              >
                {senhaVisivel ? "Ocultar" : "Mostrar"}
              </button>
            </span>
            {modoCadastro && (
              <span className="field-help">Mínimo de 8 caracteres.</span>
            )}
          </div>

          {erro && (
            <div className="notice notice-error" role="alert">
              {erro}
            </div>
          )}

          <button className="button button-primary" disabled={enviando}>
            {enviando
              ? "Aguarde..."
              : modoCadastro
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>

        <button
          className="text-button"
          onClick={() => {
            setErro("");
            setSenhaVisivel(false);
            setModoCadastro((atual) => !atual);
          }}
          type="button"
        >
          {modoCadastro
            ? "Já tem conta? Entrar"
            : "Ainda não tem conta? Cadastre-se"}
        </button>
      </section>
    </main>
  );
}
