---
type: product
title: "Conta Comigo"
summary: "Onboarding de acessos para agências de marketing, lançado em novembro de 2026. A agência pede e acompanha tudo num link só, o cliente segue um passo a passo sem criar conta e a equipe confirma cada acesso."
date: 2026-10-01
updated: 2026-11-16
status: live
tags: ["SaaS B2B", "Onboarding de clientes", "Multiagente", "Lançado"]
cover: ./media/landing-pt.webp
thumbnail: ./media/thumb-pt.webp
links:
  - { label: "Conhecer o Conta Comigo", url: "https://contacomigo.brskt.dev/" }
stats:
  - { value: "57", label: "decisões de produto documentadas" }
  - { value: "7", label: "áreas na execução multiagente" }
  - { value: "489", label: "testes unitários na V1" }
  - { value: "147", label: "testes de integração na V1" }
  - { value: "46/46", label: "testes E2E com Playwright na V1" }
gallery:
  - src: ./media/request-detail-pt.webp
    alt: "Detalhe de uma solicitação na área da agência: progresso concluído pelo cliente e confirmado pela agência, itens com status e o link do cliente."
    caption: "Detalhe da solicitação: concluído pelo cliente e confirmado pela agência são progressos separados."
  - src: ./media/portal-pt.webp
    alt: "Portal do cliente no celular: marca da agência, título da solicitação, aviso para nunca compartilhar senhas e o progresso do checklist."
    caption: "Portal do cliente no celular, sem criar conta."
    orientation: portrait
  - src: ./media/builder-pt.webp
    alt: "Builder: status de publicação, salvamento automático, botão Publicar alterações e a estrutura da solicitação com seções e itens."
    caption: "O builder: seções, itens e alterações publicadas no mesmo link."
  - src: ./media/templates-pt.webp
    alt: "Galeria de templates oficiais, cada um com o número de itens e seções."
    caption: "Templates oficiais para começar."
stack:
  - "pnpm 10 + Turborepo"
  - "TypeScript 6"
  - "Next.js 16 (App Router)"
  - "React 19"
  - "NestJS 11"
  - "Prisma 7"
  - "PostgreSQL 16"
  - "Zod 4"
  - "Clerk"
  - "TanStack Query 5"
  - "React Hook Form"
  - "dnd-kit"
  - "Tailwind 4 + shadcn/ui"
  - "next-intl 4"
  - "Sentry 10"
  - "Resend"
  - "S3 (B2/MinIO)"
  - "Jest 30"
  - "Vitest 4"
  - "Playwright 1.56"
---

## O perrengue

Para começar a atender um cliente, a agência de marketing precisa de uma porção de acessos: contas de anúncio, Analytics, domínio, redes sociais. Sem um lugar central, as instruções e o acompanhamento do que já foi liberado ficam espalhados.

## A ideia

Um checklist guiado, em quatro passos:

1. **A agência monta o checklist**, a partir de um template oficial ou do zero.
2. **Envia um link.** Cada solicitação tem um link secreto, e o cliente vê só aquela solicitação.
3. **O cliente preenche no ritmo dele.** As respostas são salvas sozinhas, ele anexa prints quando ajuda e envia para revisão quando termina.
4. **A agência confere e registra.** Confirma o item ou devolve com um motivo. "Concluído pelo cliente" e "confirmado pela agência" são status diferentes.

## No ar desde 16 de novembro de 2026

O Conta Comigo foi lançado e está aberto para uso em [contacomigo.brskt.dev](https://contacomigo.brskt.dev/), com teste grátis de 30 dias, sem cartão. A versão lançada traz:

- Passo a passo pronto para 53 plataformas, conferido na ajuda oficial de cada uma e com a data da última revisão.
- 9 templates prontos, além dos que a agência monta.
- Portal do cliente com a marca da agência, sem criar conta, com a opção de passar um item para outra pessoa.
- Lembretes automáticos por e-mail ou pelo WhatsApp.
- Cofre de acessos por cliente: quando a plataforma não tem convite, o login vai cifrado para o cofre, aberto só por quem tem acesso e com histórico de quem viu.
- Mapa do que já foi liberado em cada plataforma e aviso de acesso que parou de funcionar.
- Equipe sem custo por pessoa, com parceiros e freelancers vendo só os clientes liberados.
- Planos por agência, pelo número de solicitações publicadas por mês.

## O que ele não faz, de propósito

É um passo a passo com acompanhamento, não uma automação:

- Não concede, detecta nem verifica acessos. A agência confere na plataforma e registra no Conta Comigo.
- Não se conecta às contas do Google, da Meta ou de outras plataformas de marketing.
- Não pede códigos de verificação. Quando a plataforma não tem convite e a agência precisa de um login, ele vai cifrado para o cofre do cliente.
- Revogar o link não revoga acessos já concedidos nas plataformas.

## Antes do lançamento: a V1 como demo pública

Antes de ser lançado, o Conta Comigo ficou no ar como demo pública, com dados fictícios e uma agência em modo somente leitura. Tudo daqui para baixo conta como aquela primeira versão foi feita e posta no ar.

### O que tinha na V1

#### Para a agência

- Montador de checklists com seções, itens, 7 tipos de campo, condições e arrastar e soltar (também pelo teclado).
- Templates próprios, templates oficiais e biblioteca de blocos.
- Solicitações por cliente, com alterações publicadas no mesmo link.
- Revisão item a item, comentários, notas internas e histórico.
- Analytics, membros, convites e a marca da agência no portal.

#### Para o cliente

- Portal por link seguro, sem criar conta.
- Salvamento automático e progresso sempre visível.
- Envio de imagens como evidência e pedido de ajuda em cada item.
- Tudo em PT-BR e EN.

### Como foi construído

A especificação tem **57 decisões e 10 regras de produto** documentadas. A V1 saiu de uma execução multiagente: um líder integrando sete áreas, Foundation, Builder, Content, Client Portal, Ops, Public e QA.

### Arquitetura

```text
Navegador ──páginas──▶ Vercel (Next.js 16)
   │                      │ rewrite /api/v1 (mesma origem, cookies seguros)
   │                      ▼
   │               Render (1 serviço Free)
   │               ├─ API NestJS 11 ──SQL──────────▶ Neon (PostgreSQL 16)
   │               └─ worker ──fila de e-mails─────▶ Neon
   │                    └──e-mails (allowlist)─────▶ Resend
   ├──login──▶ Clerk ◀──valida a sessão── API
   └──upload/download (URL assinada)──▶ Backblaze B2 (S3) ◀──assina URLs── API
Web e API ──erros──▶ Sentry
GitHub Actions ──CI · migrations · reset da demo──▶ Neon
```

- O navegador só conversa com a Vercel. As chamadas `/api/v1` são repassadas à API.
- Os arquivos vão direto do navegador ao B2, com URLs assinadas.
- O worker roda no mesmo serviço da API.
- Os deploys saem da branch `main`.

### Tudo no plano grátis

| Peça | Serviço | Observação |
|---|---|---|
| Web | Vercel Hobby | build com a flag de demonstração |
| API + worker | Render Free | dois processos num serviço; dorme sem uso |
| Banco | Neon Free | suspende sozinho quando parado |
| Arquivos | Backblaze B2 | 10 GB grátis, bucket privado |
| Login | Clerk (desenvolvimento) | cadastro livre |
| E-mail | Resend Free | só entrega para o fundador |
| Erros | Sentry Developer | sem dados de usuário |
| CI e dados | GitHub Actions | workflows manuais com confirmação |

### Feito para ser uma demo

- **Ambientes explícitos.** A variável `DEPLOY_ENV` separa local, staging e produção. O staging exige Clerk de desenvolvimento e allowlist de e-mail, a produção recusa chaves de teste, e um erro de inicialização cita a variável e o motivo, nunca o valor.
- **E-mail só para quem deve.** O worker descarta qualquer destinatário fora da allowlist antes de chegar ao provedor.
- **Invisível para buscadores.** `robots.txt` bloqueando tudo, sitemap vazio e cabeçalho `noindex` em todas as respostas.
- **API e worker num serviço grátis.** Um launcher sobe os dois processos; se um cai, o serviço reinicia.
- **Dados de demo pelas rotas reais da API.** Uma agência fictícia com 6 clientes, 5 templates, 2 blocos e 8 solicitações em todos os estados, com histórico espalhado por semanas para alimentar os analytics. O link do portal é fixo entre resets e a fila de e-mail fica silenciada.
- **Reset com travas.** Confirmação digitada, só a partir da `main` e só em banco com "demo" no nome. O reset diário é opcional.
- **Cadastro livre, agência só para ver.** No staging, quem não é membro lê qualquer agência e recebe `403 (DEMO_READ_ONLY)` em qualquer escrita, e ninguém cria agência. Na interface: aviso no topo, ações escondidas e editores travados, sem salvamento automático. Fora do staging, nada muda.
- **Configuração à prova de deslize.** URLs exigem `https://` e a mensagem de erro mostra o formato. O build do web falha se o endereço do storage estiver inválido; antes, uploads e imagens quebrariam no navegador sem nenhum aviso.
- **CI de volta ao verde.** A imagem do MinIO deixou de ser pública e foi trocada pela da Chainguard, no CI e no ambiente local.

### Segurança e privacidade

- Regras e autorização só na API. O web nunca acessa o banco.
- **Link do portal:** o token é guardado só como hash e cópia cifrada (AES-256-GCM). Ele vira uma sessão em cookie `HttpOnly`, restrito ao caminho do portal. Alterações exigem origem válida e cabeçalho anti-CSRF.
- Logs sem corpos de requisição, tokens, cookies, cabeçalhos de login ou URLs assinadas.
- Sentry com coleta de dados desligada, URLs sem parâmetros, sem gravação de sessão nem rastreio de desempenho.
- Segredos exclusivos do staging, só nos painéis. Fora do staging, quem não é membro recebe um 404 genérico.

### Qualidade

- **489 testes unitários:** shared 121, content 126, API 75 e web 167.
- **147 testes de integração** em 20 suítes, com Postgres, MinIO e Mailpit reais.
- **46 de 46 testes E2E** com Playwright, em duas execuções completas, incluindo auditoria de acessibilidade WCAG A/AA nos temas claro e escuro.
- CI verde no GitHub Actions: lint, typecheck, unitários, integração, E2E e build.
- Conferência visual do visitante: 15 telas, sem nenhuma tentativa de alteração saindo da página.

### Bastidores do deploy: 6 tropeços reais

1. **O seed falhou com `S3_ENDPOINT: Invalid URL`.** O painel do B2 mostra o endpoint sem `https://`. O valor foi corrigido e a validação ganhou uma mensagem clara.
2. **A API não subiu no Render.** O serviço tinha sido criado sem nenhuma variável de ambiente.
3. **A Vercel não fazia nenhum deploy.** No plano Hobby com repositório privado, ela bloqueia commits cujo autor não é o dono da conta, e os commits vinham de automação. Um commit do dono destravou.
4. **O build da Vercel falhou, de propósito.** A trava nova pegou o mesmo endpoint sem `https://`.
5. **Login travado em "Carregando seu espaço…".** A Vercel deu outro domínio ao projeto, e a API só aceita sessões do domínio configurado. Ligar o domínio esperado ao projeto resolveu.
6. **O Sentry recusava eventos (`403 ProjectId`).** A DSN misturava a chave de um projeto com o número de outro. Copiar de novo resolveu.

### Custo e limites

- **R$ 0 por mês.**
- O Render dorme após 15 min sem acesso e acorda em cerca de 1 min, com limite de 750 h/mês.
- O Neon dorme após 5 min parado e acorda em segundos, com limite de 100 CU-hora/mês. Por isso a API não fica acordada o dia todo.
- Outros limites: B2 com 10 GB, Clerk de desenvolvimento com 100 usuários, Resend com 100 e-mails por dia e Vercel Hobby só para uso pessoal.
