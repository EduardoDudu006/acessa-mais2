# ACESSA+

Plataforma colaborativa para registrar barreiras de acessibilidade urbana em Recife. O repositório contém uma API FastAPI, um site React/Vite e um aplicativo Expo.

## Requisitos

- Windows 10/11
- Python 3.10 ou superior
- Node.js 22.12 ou superior

## Configuração local — passo a passo

Não é necessário instalar PostgreSQL nem Docker para testar localmente: a API usa um arquivo SQLite persistente por padrão. Abra dois terminais PowerShell na pasta do projeto.

### 1. Configure e execute a API

No primeiro terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Gere uma chave JWT aleatória e grave no `.env`:

```powershell
$secret = python -c "import secrets; print(secrets.token_urlsafe(48))"
(Get-Content .env) -replace '^SECRET_KEY=.*$', "SECRET_KEY=$secret" | Set-Content -Encoding ascii .env
```

Mantenha `DATABASE_URL=sqlite:///./acessa_local.db` para o modo local. Inicie a API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Endereços locais:

- API: <http://localhost:8000>
- Documentação interativa: <http://localhost:8000/api/docs>
- Verificação: <http://localhost:8000/api/v1/health>

Na primeira execução, a API cria as tabelas no arquivo `backend/acessa_local.db`.

### 2. Configure e execute o site

No segundo terminal:

```powershell
cd frontend
npm install
$env:VITE_API_URL = "http://localhost:8000/api/v1"
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente <http://localhost:5173>. Crie uma conta pela própria tela inicial.

Para produção ou outro endereço de API, defina `VITE_API_URL` antes de iniciar ou compilar o frontend. Configure também `CORS_ORIGINS` no backend com a origem exata do site, sem barra final. Exemplo:

```text
CORS_ORIGINS=http://localhost:5173,https://seu-dominio.example
```

### 3. Aplicativo mobile (opcional)

Para Android Emulator:

```powershell
cd mobile
npm install
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:8000/api/v1"
npx expo start
```

Em um celular físico, use no lugar de `10.0.2.2` o endereço IP local do computador na rede Wi-Fi. Para iOS Simulator, normalmente use `http://localhost:8000/api/v1`. O celular e o computador precisam estar na mesma rede, e o firewall deve permitir a porta 8000.

O aplicativo permite criar conta/entrar e mantém ocorrências offline por conta; a fila é enviada quando a conexão retorna.

## Funcionalidades conectadas à API

- Cadastro, login e sessão com token JWT.
- Registro de ocorrências associado ao usuário autenticado.
- Mapa e lista com ocorrências armazenadas, filtro por status e confirmação comunitária.
- Estatísticas agregadas por status e categoria.
- Perfil, pontuação e ranking calculados a partir dos dados do banco.
- Busca e seleção de endereços para ocorrências e rotas; as coordenadas são resolvidas internamente.
- Planejamento de rota com obstáculos próximos reportados.

O roteamento usa o serviço público OSRM e retorna uma rota a pé. O perfil altera o tempo estimado, mas não garante que o trajeto seja acessível para cadeira de rodas. O resultado é informativo e não substitui uma auditoria presencial. O carregamento do mapa e o cálculo de rotas dependem de acesso à internet.

O SQLite local calcula distâncias geográficas diretamente; em produção, use PostgreSQL com PostGIS definindo `DATABASE_URL` para `postgresql://...` e habilitando a extensão `postgis` no banco. O arquivo `compose.yaml` fornece um PostGIS opcional para desenvolvimento.

A busca de endereços usa o Nominatim/OpenStreetMap, é acionada somente quando a pessoa clica em **Buscar**, mantém cache em memória e limita as consultas a no máximo uma por segundo por processo. O endereço digitado é enviado ao serviço para pesquisa; a tela mostra a atribuição ao OpenStreetMap. Configure `NOMINATIM_USER_AGENT` e, se necessário, `NOMINATIM_URL` no ambiente do backend. Para várias instâncias ou tráfego maior, use um provedor próprio/comercial compatível e respeite o limite global do serviço público.

## Verificação do site

```powershell
cd frontend
npm run build
```

## Observações para publicação

- Configure `DATABASE_URL`, `SECRET_KEY` aleatória e `CORS_ORIGINS` no ambiente do servidor; nunca publique `backend/.env`.
- Use HTTPS em produção.
- PostgreSQL exige PostGIS habilitado; SQLite é destinado à execução local simples.
- O backend cria tabelas automaticamente para facilitar o início local; para evolução de produção, adote migrações Alembic antes de alterar o esquema.
