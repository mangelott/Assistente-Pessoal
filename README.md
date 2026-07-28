# Assistente Pessoal

Assistente pessoal por voz (PWA) que ajuda a automatizar estas tarefas:

1. **Pesquisar empresas** (ex: "procura empresas de marketing em Lisboa") e recolher nome, telefone, email e website.
2. **Redigir emails em lote** às empresas encontradas (ex: "escreve um email a apresentar os meus serviços"), e preparar um rascunho por destinatário na tua conta Gmail para reveres e enviares manualmente — a aplicação nunca envia nada sozinha, e há sempre um limite máximo de 15 destinatários por campanha.
3. **Pesquisar na tua caixa de correio Gmail** (ex: "encontra o email onde o João me mandou o contrato") — só leitura, nunca apaga nem altera nada.

Funciona como PWA — instalável no telemóvel (Android/iOS) ou no computador, com comandos por voz (Web Speech API) para usar em mãos-livres, por exemplo a conduzir.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Claude (Anthropic API)** — interpreta os comandos de voz/texto e decide qual ação executar (tool use), e redige os emails
- **Google Places API** — pesquisa de empresas (opcional; sem chave configurada, usa dados de exemplo)
- **Gmail API** (OAuth) — cria rascunhos e pesquisa emails na conta Gmail do utilizador
- Autenticação simples de utilizador único (JWT em cookie httpOnly), pensada para uso pessoal

## Arquitetura

O assistente funciona como um motor de "skills" extensível:

```
comando (voz/texto)
  → Claude decide a intenção (tool use)
  → executa a skill correspondente (src/lib/skills/*)
  → Claude formula a resposta falada, com base no resultado
```

Skills atuais:

- `search_companies` — pesquisa empresas e grava-as numa `SearchSession` (`src/lib/skills/searchCompaniesSkill.ts`)
- `draft_email_campaign` — redige assunto+corpo do email e cria uma `EmailCampaign` pendente de confirmação, limitada a 15 destinatários com email disponível e ainda não contactados (`src/lib/skills/draftEmailCampaignSkill.ts`)
- `create_gmail_drafts` — cria um rascunho por destinatário na conta Gmail ligada, sem enviar nada, para revisão manual (`src/lib/skills/createGmailDraftsSkill.ts`)
- `search_gmail` — pesquisa (só leitura) na caixa de correio Gmail ligada, usando a sintaxe de pesquisa do Gmail (`src/lib/skills/searchGmailSkill.ts`)

Novas skills podem ser adicionadas registando-as em `src/lib/assistant/tools.ts` e `src/lib/assistant/orchestrator.ts`.

## Configuração

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Copiar `.env.example` para `.env` e preencher:

   ```bash
   cp .env.example .env
   ```

   | Variável | Obrigatória | Descrição |
   |---|---|---|
   | `DATABASE_URL` | sim | Ligação PostgreSQL |
   | `AUTH_SECRET` | sim | Segredo aleatório para assinar a sessão (ex: `openssl rand -hex 32`) |
   | `ADMIN_EMAIL` | sim | O teu email de login |
   | `ADMIN_PASSWORD_HASH` | sim | Hash bcrypt da password (ver abaixo) |
   | `ANTHROPIC_API_KEY` | sim | Chave da API da Anthropic (Claude) |
   | `GOOGLE_PLACES_API_KEY` | não | Sem esta chave, a pesquisa de empresas devolve dados de exemplo |
   | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | não, só para rascunhos no Gmail | Credenciais OAuth do Google Cloud Console (ver abaixo) |

3. Gerar o hash da password de login:

   ```bash
   npm run hash-password -- "a-tua-password"
   ```

   Copia o resultado para `ADMIN_PASSWORD_HASH` no `.env`.

4. Criar as tabelas na base de dados:

   ```bash
   npm run prisma:migrate
   ```

5. Correr em desenvolvimento:

   ```bash
   npm run dev
   ```

   Abre `http://localhost:3000`, entra com o email/password configurados, e instala a PWA a partir do menu do navegador ("Adicionar ao ecrã principal" / "Instalar aplicação").

### Ligar o Gmail (para rascunhos e pesquisa)

Sem isto, a app pesquisa e redige emails, mas não consegue preparar rascunhos nem pesquisar na caixa de entrada:

1. No [Google Cloud Console](https://console.cloud.google.com), no mesmo projeto onde ativaste a Places API (ou noutro):
   - **APIs e Serviços → Biblioteca** → pesquisa e ativa a **"Gmail API"**.
   - **APIs e Serviços → Ecrã de consentimento OAuth** → tipo "Externo" → preenche o nome da app e o teu email → em "Scopes" adiciona `https://www.googleapis.com/auth/gmail.compose`, `https://www.googleapis.com/auth/gmail.readonly` e `https://www.googleapis.com/auth/userinfo.email` → em "Utilizadores de teste" adiciona o teu próprio email (enquanto a app estiver em modo de testes, só estes emails conseguem autorizar) → **guarda em ambos os níveis** (o botão do painel de scopes e depois o "Save" da página principal).
   - **APIs e Serviços → Credenciais → Criar Credenciais → ID de cliente OAuth** → tipo "Aplicação Web" → em "URIs de redirecionamento autorizados" adiciona exatamente o valor de `GOOGLE_OAUTH_REDIRECT_URI` (ex: `http://localhost:3000/api/auth/google/callback`).
   - Copia o **Client ID** e o **Client Secret** para o `.env`.
2. Reinicia o `npm run dev`, entra na app, e clica em **"Ligar Gmail"** no topo da página — vais ser redirecionado para autorizares o acesso.

Este acesso pede os scopes `gmail.compose` (criar/gerir rascunhos e enviar o que a app compuser), `gmail.readonly` (ler a caixa de entrada, para a pesquisa de emails — nunca apaga nem altera nada) e `userinfo.email` (só para saber a que conta ligaste).

**Importante:** `gmail.readonly` é um scope "sensível" para a Google. Como a app não está verificada oficialmente (fica em modo de testes, o que é normal para uso pessoal), o acesso expira ao fim de **7 dias** — depois disso basta clicares em "Ligar Gmail" outra vez para renovar.

## Notas importantes

- **Nunca envia nem cria rascunhos sem instrução explícita.** Cada campanha de email fica pendente até dizeres claramente que queres despachá-la — o botão "Guardar rascunhos no Gmail" na interface faz o mesmo, sem precisar de voz.
- **Limite de 15 destinatários por campanha**, e empresas com rascunho já criado não voltam a ser incluídas automaticamente numa campanha seguinte.
- Sem `GOOGLE_PLACES_API_KEY`, as pesquisas devolvem empresas de exemplo (claramente identificadas na interface) para poderes testar o fluxo todo sem custos.
