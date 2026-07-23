# Assistente Pessoal

Assistente pessoal por voz (PWA) para automatizar duas tarefas:

1. **Pesquisar empresas** (ex: "procura empresas de marketing em Lisboa") e recolher nome, telefone, email e website.
2. **Redigir e enviar emails em lote** às empresas encontradas (ex: "escreve um email a apresentar os meus serviços e envia"), sempre com um passo de confirmação antes do envio e um limite máximo de 15 destinatários por campanha.

Funciona como PWA — instalável no telemóvel (Android/iOS) ou no computador, com comandos por voz (Web Speech API) para usar em mãos-livres, por exemplo a conduzir.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Claude (Anthropic API)** — interpreta os comandos de voz/texto e decide qual ação executar (tool use), e redige os emails
- **Google Places API** — pesquisa de empresas (opcional; sem chave configurada, usa dados de exemplo)
- **Resend** — envio de email transacional
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
- `confirm_send_campaign` — envia definitivamente uma campanha pendente, só depois de confirmação explícita do utilizador, por voz ou pelo botão na interface (`src/lib/skills/confirmSendCampaignSkill.ts`)

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
   | `RESEND_API_KEY`, `EMAIL_FROM` | sim, para enviar emails | Conta Resend com domínio verificado |
   | `EMAIL_REPLY_TO`, `SENDER_NAME`, `SENDER_ADDRESS` | não | Usados no rodapé de identificação/opt-out dos emails |

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

## Notas importantes

- **Nunca envia sem confirmação.** Cada campanha de email fica pendente até seres tu, por voz ("sim, envia") ou pelo botão "Confirmar e enviar", a autorizar o envio.
- **Limite de 15 destinatários por campanha**, e empresas já contactadas com sucesso não voltam a ser incluídas automaticamente numa campanha seguinte.
- **Cumprimento legal (RGPD):** todos os emails incluem um rodapé a identificar o remetente e a explicar como pedir para não voltar a ser contactado. Configura `SENDER_NAME`/`SENDER_ADDRESS` antes de enviar campanhas reais.
- Sem `GOOGLE_PLACES_API_KEY`, as pesquisas devolvem empresas de exemplo (claramente identificadas na interface) para poderes testar o fluxo todo sem custos.
