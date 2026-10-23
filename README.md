# brskt-space

Meu espaço pessoal: trajetória, projetos e artigos técnicos, em português e inglês.

**No ar:** https://brskt.dev/ (os endereços antigos `https://brskt-dev.github.io/brskt-space/…` redirecionam para cá)

Feito com [Astro](https://astro.build), saída 100% estática (sem JavaScript no navegador, fora o
redirecionamento de idioma da página inicial). Cada push na branch `main` gera, verifica e publica o
site no GitHub Pages.

- [Estrutura](#estrutura)
- [Como adicionar uma publicação](#como-adicionar-uma-publicação)
- [Como atualizar o resto do conteúdo](#como-atualizar-o-resto-do-conteúdo)
- [Rodar localmente](#rodar-localmente)
- [Deploy](#deploy)
- [Mapa de URLs](#mapa-de-urls)
- [Domínio próprio (mais tarde)](#domínio-próprio-mais-tarde)
- [Problemas comuns](#problemas-comuns)

## Estrutura

| Onde | O que fica lá |
|---|---|
| `src/content/publications/<slug>/pt.md` e `en.md` | Publicações: produtos, experimentos e artigos. Uma pasta = uma publicação, nos dois idiomas. |
| `src/content/pages/home/{pt,en}.md` | Texto da home. |
| `src/content/pages/about/{pt,en}.md` | Texto da página Sobre. |
| `src/content/pages/dev-partner/{pt,en}.md` | Todo o texto da landing do Dev parceiro (o valor em `offer`, a comparação com o mercado em `conditions.compare`). |
| `src/data/profile.ts` | Dados do currículo: contatos, experiência, competências, formação, idiomas. |
| `src/i18n/ui.ts` | Textos da interface (menu, rodapé, rótulos de status e tipo), nomes das rotas e funções de URL. |
| `src/lib/url.ts` | Montagem de URLs com o prefixo do site (`base` do `astro.config.mjs`, hoje `/`). |
| `src/lib/publications.ts` | Validação das publicações no build (par pt/en, campos iguais). |
| `src/content.config.ts` | Regras do frontmatter: tipos, valores de `status`, formato de data. Um status novo também precisa do rótulo `status.*` em `src/i18n/ui.ts` (sem ele, aparece o valor cru). |
| `src/pages/[lang]/[...path].astro` e `src/lib/routes.ts` | Geram todas as páginas `/pt/` e `/en/` e o `sitemap.xml`; o conteúdo de cada página fica em `src/components/views/`. Não crie arquivos em `src/pages/pt/` ou `src/pages/en/`: eles ficam fora do sitemap e do menu. |
| `src/assets/` | Foto (otimizada no build). |
| `src/components/`, `src/layouts/`, `src/styles/` | Visual e corpo das páginas (`views/`). Cores (tema escuro espacial), fontes, cards, skeletons e animações em `src/styles/global.css`; ícones em `src/components/ui/Icon.astro`. |
| `public/` | Arquivos copiados sem mudança, como `favicon.svg`. |
| `templates/publication/` | Modelos para novas publicações. Ficam fora de `src/` e nunca vão para o site. |
| `demos/` | Código de demonstração dos artigos (ex.: `demos/agent-ready-api`, em .NET). Fica fora do build do site; cada pasta tem o próprio README e os próprios testes. |
| `scripts/verify-dist.mjs` | Verificação do site gerado: links, prefixo do site, metadados, idiomas. |
| `.github/workflows/deploy.yml` | Build, verificação e deploy no GitHub Pages. |

## Como adicionar uma publicação

**1. Escolha o slug.** Letras minúsculas, números e hífens, por exemplo `meu-projeto`. Ele é o nome da
pasta **e** o final da URL nos dois idiomas:
`/pt/projetos/meu-projeto/` e `/en/projects/meu-projeto/` (para artigos: `/pt/artigos/…` e `/en/articles/…`).
Depois de publicado, trocar o slug quebra links antigos.

**2. Copie os modelos** para a pasta nova:

```sh
mkdir -p src/content/publications/meu-projeto
cp templates/publication/pt.md templates/publication/en.md src/content/publications/meu-projeto/
```

**3. Preencha o frontmatter** (o bloco entre `---` no topo) dos dois arquivos. Os modelos já explicam cada
campo em comentários. Troque todo `TODO` dos modelos; o `npm run verify` (e o deploy) falha enquanto sobrar algum.

| Campo | Obrigatório | O que é |
|---|---|---|
| `type` | sim | `product` (produto), `experiment` (experimento), `article` (artigo) ou `service` (serviço contratável). Produtos, experimentos e serviços aparecem em Projetos; artigos, em Artigos. |
| `title` | sim | Título da página e dos cards. |
| `summary` | sim | Uma ou duas frases. Vai nos cards e na meta description. |
| `date` | sim | Dia em que entra no site, `AAAA-MM-DD` (ex.: `2026-10-01`). Outro formato, como `01/10/2026`, faz o build falhar. |
| `updated` | não | Dia da última atualização relevante, `AAAA-MM-DD`. |
| `status` | em product, experiment e service | `in-development`, `demo` (demo pública no ar), `live`, `paused`, `archived`. Experimentos também aceitam `running` e `concluded`. Serviços usam `available` (disponível para contratação) ou `paused`. Em artigos, apague a linha. |
| `planet` | não | Tema de cor de um planeta para a página e o card da publicação: hoje só `mars` (o Dev parceiro). Igual nos dois idiomas. |
| `landing` | não (só em service) | A landing do serviço, quando existe: `devPartner` (igual nos dois idiomas). A página do projeto ganha os botões "Conversar pelo WhatsApp" e "Ver todos os detalhes". |
| `thumbnail` | não | Imagem do card na home e nas listagens. Sem ela, o card usa a `cover`. |

> **Artigos:** o tempo de leitura é calculado sozinho a partir do texto (cerca de 200 palavras por minuto), não precisa preencher. Para diagramas e ilustrações animadas, use `pt.mdx`/`en.mdx` em vez de `.md` e importe componentes de `src/components/diagrams/` (veja o artigo `interface-como-integracao` como exemplo). Blocos de código ganham moldura de terminal automaticamente.

| `stats` | não | Números de destaque em cards: `{ value, label }`. Só números reais. |
| `stack` | não | Lista de tecnologias, mostrada em chips no fim da página. |
| `gallery` | não | Telas: `{ src: ./arquivo.webp, alt, caption, orientation }` (`portrait` para telas de celular). Arquivos na pasta da publicação. |
| `tags` | não | Palavras-chave curtas, no idioma de cada arquivo. |
| `links` | não | Só links reais (site no ar, repositório, demo). Nunca link provisório. |
| `cover` | não | Imagem de capa na mesma pasta, por exemplo `./cover.png`. Só se a imagem existir. |
| `draft` | não (padrão: `false`) | `true` = rascunho, fica fora do site. `false` ou sem a linha = publicada. Os modelos começam em `true`, então apagar a linha publica. |

`type`, `date`, `updated`, `status`, `draft`, `landing` e `planet` precisam ser **iguais** em `pt.md` e `en.md`. Título, resumo, tags e texto
são traduzidos.

**4. Escreva o texto** em Markdown, abaixo do frontmatter. O modelo traz um roteiro de seções para cada tipo:
mantenha só o do seu tipo e apague o resto (e os comentários `<!-- -->`). Use `##` e `###` para seções; o
título da página já é o `h1`.

**5. Imagens** ficam na mesma pasta da publicação: `![descrição da imagem](./print-da-tela.png)`. O Astro
otimiza no build. Sempre escreva a descrição (é o texto alternativo).

**6. Confira:** `npm run dev` e abra a página. Enquanto `draft: true`, ela não aparece; mude para `false` nos
dois arquivos para ver. Antes do push, rode `npm run verify`.

**7. Publique:** commit e push na `main` (ou trabalhe numa branch como a `dev` e abra um PR para a `main`: o merge publica). A seção (Projetos ou Artigos) aparece sozinha no menu quando
ganha a primeira publicação; seção sem conteúdo não existe no site.

> **Por que o build recusa publicação sem tradução?** O site é inteiro bilíngue e o botão de idioma sempre leva
> para a mesma página no outro idioma. Uma publicação só em português deixaria esse botão (e os links
> `hreflang` para buscadores) apontando para uma página que não existe. Por isso `src/lib/publications.ts`
> interrompe o build com uma mensagem que diz qual slug e qual arquivo faltam, e nada é publicado.
> Enquanto a tradução não fica pronta, deixe `draft: true` no arquivo que já existe: rascunho sozinho é
> ignorado.

## Como atualizar o resto do conteúdo

Sempre mexa nos dois idiomas juntos.

- **Home:** `src/content/pages/home/{pt,en}.md`. No frontmatter: `title`, `description` (meta description),
  `headline` (a saudação grande), `tagline` e `availability` (selo de disponibilidade). O texto abaixo do
  frontmatter é a introdução. Os títulos das seções (`// missões em andamento` etc.) ficam em `src/i18n/ui.ts`.
- **Projetos e artigos na home:** a home mostra uma linha de 4 projetos e um grid 4×2 de artigos. Os espaços
  sem publicação viram *skeletons* ("em órbita") automaticamente; não há nada para editar. O botão
  "Ver todos" dos artigos fica desativado ("em breve") até existir o primeiro artigo.
- **Imagens das publicações:** sem `cover:`, cada publicação ganha uma capa espacial gerada a partir do slug
  (`src/components/ui/Cover.astro`). Para usar uma imagem real, coloque o arquivo na pasta da publicação e
  preencha `cover: ./capa.png` nos dois idiomas.
- **Sobre:** `src/content/pages/about/{pt,en}.md`. Frontmatter com `title`, `description` e `story` (os cards
  da "versão curta": `when`, `title`, `text` e `icon`, um de `receipt`, `cpu`, `server`, `bot`, `rocket`,
  `code`, `terminal`, `sparkles`). O texto abaixo é a introdução.
- **Dev parceiro (serviço):** a landing fica em `src/content/pages/dev-partner/{pt,en}.md`: título, situações,
  passos, condições, perguntas frequentes e a mensagem que já vem escrita no WhatsApp (`whatsappMessage`). O
  **valor aparece só na seção "Quanto custa"** da landing: vem de `offer.monthlyPrice` e é mostrado no quadro de
  preço e no primeiro card da comparação. Ele não aparece no topo da landing, no banner da home, na entrada de
  Projetos, nas imagens de compartilhamento nem nos dados estruturados. **O prazo do contrato não aparece em
  lugar nenhum do site**: ele é passado no WhatsApp, depois da primeira conversa. A comparação ("Comparando com
  outros jeitos de contratar") fica em `conditions.compare`: valores de referência publicados por terceiros,
  cada um com a fonte (`source` aponta para a lista `sources`, que vira a lista numerada com links). Ao trocar
  um valor de referência, troque a fonte junto e confira as contas do texto (ex.: 40 horas × valor/hora).
  O mascote do serviço é um rover marciano (`src/components/mascot/Rover.astro`, SVG desenhado com as cores do
  tema): `pose` (`wave`, `point`, `build`, `scan`, `flag`, `think`, `drive`, `rest`) e `mood` (`happy`,
  `curious`, `focused`, `excited`, `thinking`, `wink`, `neutral`). Ele aparece ao longo da landing, no banner da
  home (em cima de Marte) e nas imagens de compartilhamento. É decorativo (`aria-hidden`), e a animação para
  com "reduzir movimento". Para tirar a oferta do ar, use `status: paused` (some o banner da home e
  o selo vira "pausado"; a landing e o link do cabeçalho continuam no ar) ou `draft: true` na publicação.
  O Dev parceiro tem a cor de Marte (laranja-ferrugem): a classe `.planet-mars` em `src/styles/global.css` troca a
  paleta. Ela vale na landing, na página e no card do projeto (`planet: mars` no frontmatter), no banner da home e no
  link do cabeçalho. Para mudar o tom, mexa nesse bloco (as cores de texto têm o contraste anotado), no `planetThemeColor` de
  `src/layouts/BaseLayout.astro` (cor da barra do navegador), em `public/giscus-theme-mars.css` (comentários) e gere de novo
  as imagens de compartilhamento, capa e miniatura. A entrada em Projetos é `src/content/publications/dev-parceiro/`
  (`type: service`, `landing: devPartner`). Os botões de WhatsApp contam cliques no GoatCounter como
  `whatsapp-<lugar>-<idioma>` (ex.: `whatsapp-dev-parceiro-hero-pt`). A imagem de compartilhamento da landing
  fica em `src/assets/og/dev-partner-{pt,en}.jpg` (1200×630).
- **Faixa de ferramentas da home:** lista `stack` em `src/data/profile.ts`.
- **Currículo** (experiência, competências, formação, idiomas, contatos): `src/data/profile.ts`. Cada texto
  traduzível é um objeto `{ pt: '…', en: '…' }`. Nomes de empresas e tecnologias ficam como estão.
- **Textos da interface** (menu, rodapé, rótulos de status e tipo, página 404): objeto `strings` em
  `src/i18n/ui.ts`. Cada chave tem `pt` e `en`.
- **Foto:** substitua `src/assets/bruno-anhezini.jpg` mantendo o nome. Ela também gera a imagem de
  compartilhamento (Open Graph).

## Rodar localmente

Precisa de Node.js 22.12 ou mais novo (exigência do Astro 7).

```sh
npm ci            # instala as dependências exatas do package-lock.json
npm run dev       # servidor local em http://localhost:4321/
npm run check     # checagem de tipos: acusa texto sem tradução em src/i18n/ui.ts e src/data/profile.ts
npm run verify    # checagem de tipos + build de produção + verificação (o mesmo que o deploy roda)
npm run preview   # serve o build da pasta dist/ em http://localhost:4321/
```

`npm run verify` falha (e lista o que corrigir) se encontrar link quebrado, URL fora do prefixo do
site (`base`), página sem título, `h1`, descrição ou canonical, página sem o par no outro idioma, link
`#âncora` para um id inexistente, telefone fora das páginas permitidas, ou texto de rascunho no HTML (`STUB`,
`TODO`, `FIXME`, `lorem ipsum`, `undefined`, `NaN`, `[object Object]`). Blocos de código são ignorados nessa
última checagem. Para testar também os links externos (só avisa, não falha):

```sh
node scripts/verify-dist.mjs --external
```

## Deploy

1. Push (ou merge de PR) na branch `main` (ou, em **Actions → Deploy to GitHub Pages → Run workflow**, para rodar na mão).
2. O GitHub Actions roda `npm ci` e `npm run verify` (checagem de tipos + build + verificação).
3. Se tudo passar, envia a pasta `dist/` e publica em https://brskt.dev/.
4. Se algo falhar, **nada é publicado** e o site continua na versão anterior. O erro aparece na aba
   **Actions**, no passo "Build and verify".

**Só na primeira vez** (no repositório):

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Em **Actions**, abra a última execução que falhou e clique em **Re-run all jobs** (ou rode
   **Deploy to GitHub Pages → Run workflow** na `main`).

## Reações e comentários (giscus)

Cada página de projeto e artigo tem um bloco de reações (os 8 emojis do GitHub, com contador) e comentários,
guardados como **Discussions** deste repositório pelo [giscus](https://giscus.app). PT e EN da mesma
publicação compartilham a mesma discussão (o slug é a chave). Para reagir, o visitante entra com o GitHub.

- Configuração: `src/data/giscus.ts`. Com `categoryId` vazio o bloco não aparece no site.
- Visual (tema escuro do site): `public/giscus-theme.css`.
- Moderação: aba **Discussions** do repositório (editar, ocultar, bloquear, apagar).

## Visitas (GoatCounter)

O site conta visitas com o [GoatCounter](https://www.goatcounter.com): sem cookies e sem dados pessoais,
então não precisa de banner de consentimento. O painel mostra visitas por página, de onde a pessoa veio
(LinkedIn, Google…), país, navegador e tamanho de tela.

- Configuração: `src/data/analytics.ts`. Com `code` vazio, nenhum script vai para o site.
- O `code` é o subdomínio escolhido no cadastro: para `https://brskt.goatcounter.com` o code é `brskt`.
  O painel fica nesse mesmo endereço.
- Cliques em links externos (LinkedIn, GitHub, demos) também são contados, como eventos `ext-<site>`
  (ex.: `ext-linkedin.com`). Isso vem de `ExternalLink.astro` e do plugin de Markdown, sem nada a fazer por publicação.
- `npm run dev` e `npm run preview` não contam: o GoatCounter ignora localhost.

## Mapa de URLs

Os caminhos abaixo vêm depois de `https://brskt.dev`.

| Página | Português | English |
|---|---|---|
| Escolha de idioma | `/` (redireciona pelo idioma do navegador; sem JS, mostra os dois links) | (mesma) |
| Início | `/pt/` | `/en/` |
| Sobre | `/pt/sobre/` | `/en/about/` |
| Projetos (lista) | `/pt/projetos/` | `/en/projects/` |
| Projeto | `/pt/projetos/<slug>/` | `/en/projects/<slug>/` |
| Dev parceiro (landing do serviço) | `/pt/servicos/dev-parceiro/` | `/en/services/dev-partner/` |
| Artigos (lista) | `/pt/artigos/` | `/en/articles/` |
| Artigo | `/pt/artigos/<slug>/` | `/en/articles/<slug>/` |
| Página não encontrada | `/404.html` (bilíngue) | (mesma) |
| Sitemap e robots | `/sitemap.xml`, `/robots.txt` | (mesmos) |

Com o domínio próprio, o `robots.txt` está na raiz (`https://brskt.dev/robots.txt`) e a linha `Sitemap:`
dele vale para os buscadores. No Google Search Console, use uma propriedade de domínio `brskt.dev` (ou
"Prefixo do URL" com `https://brskt.dev/`) e envie `https://brskt.dev/sitemap.xml`.

De onde vem cada parte:

- `https://brskt.dev` e a base `/`: constantes `SITE` e `BASE` no topo de `astro.config.mjs`.
- `pt` / `en`: os dois idiomas do site.
- `sobre`, `projetos`, `artigos` (e os nomes em inglês): `segments` em `src/i18n/ui.ts`. Trocar um nome
  muda a URL de todas as páginas daquela seção.
- `<slug>`: o nome da pasta em `src/content/publications/`.
- Projetos e Artigos só existem quando há pelo menos uma publicação daquele tipo.

## Domínio próprio

O site está em **https://brskt.dev/**, com domínio próprio no GitHub Pages. O DNS do `brskt.dev` fica na
Hostinger e é administrado pelo repositório de infraestrutura (`brskt-dev/brskt-infra`). Os subdomínios
(`<produto>.brskt.dev`) são dos produtos, que rodam na VPS; o domínio raiz e o `www` são deste site.

| Onde | O quê |
|---|---|
| GitHub → Settings (da conta) → Pages | `brskt.dev` **verificado** (registro TXT `_github-pages-challenge-brskt-dev`). Impede que outra conta use o domínio no GitHub Pages |
| Este repositório → Settings → Pages | Custom domain `brskt.dev` e **Enforce HTTPS** marcado |
| DNS `brskt.dev` | `A` para `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `AAAA` para `2606:50c0:8000::153` a `2606:50c0:8003::153`; `www` `CNAME` para `brskt-dev.github.io` |
| Código | `SITE = 'https://brskt.dev'` e `BASE = '/'` em `astro.config.mjs` e em `scripts/verify-dist.mjs`; `SITE_ORIGIN` em `src/lib/url.ts`; os `?? '…'` em `BaseHead.astro`, `DevPartnerView.astro`, `robots.txt.ts` e `sitemap.xml.ts`; `public/CNAME` (opcional com deploy por Actions: o GitHub usa o domínio salvo em Settings, mas o arquivo deixa o domínio registrado aqui) |

Os endereços antigos continuam funcionando: `https://brskt-dev.github.io/brskt-space/…` redireciona para
`https://brskt.dev/…` (o GitHub faz isso sozinho quando o projeto tem domínio próprio).

Para trocar de domínio um dia: verifique o novo domínio na conta, mude o DNS, salve o novo Custom domain,
troque os valores da tabela acima no código, apague `node_modules/.astro` (o cache guarda o Markdown já
renderizado com o endereço antigo) e rode `npm run verify` antes do push.

## Problemas comuns

**No build (`npm run dev`, `npm run build` ou `npm run verify`):**

| Mensagem (trecho) | O que fazer |
|---|---|
| `[publications] Publication "x" is missing …/x/en.md` | Falta a tradução. Crie o arquivo ou deixe `draft: true` no que existe. |
| `pt.md and en.md disagree on type / date / updated / status / landing / planet` | Deixe esses campos iguais nos dois arquivos. |
| `"draft" differs between pt.md … and en.md` | `draft` precisa ser igual nos dois. |
| `"status" is required for type "product"` | Adicione `status` (veja os valores na tabela acima). |
| `status "running" is not allowed for type "product"` | `running` e `concluded` são só para experimentos. |
| `Invalid slug "Meu Projeto"` | Renomeie a pasta: minúsculas, números e hífens. |
| `publications → x/notas data does not match collection schema` (arquivo que não é `pt` nem `en`) | Todo `.md` na pasta da publicação é lido como publicação. Tire anotações e rascunhos da pasta; imagens podem ficar. |
| `Unexpected file …/x/PT.md` (ou `pt-br.md`, cópia de `pt.md`) | Só `pt.md` e `en.md`, em minúsculas. Renomeie ou apague a cópia. |
| `date: Use the YYYY-MM-DD format` | Escreva a data como `AAAA-MM-DD`, por exemplo `2026-10-01`. |
| Erro de schema citando `links.0.url`, `type`… | Campo com formato errado: URL completa com `https://`, `type` com um dos três valores. |
| Imagem não encontrada | O caminho é relativo ao `.md`: `./nome.png`, com a imagem na mesma pasta. |
| `Property 'en' is missing in type …` (ou `'pt'`) | Falta a versão em inglês (ou português) de um texto em `src/i18n/ui.ts` ou `src/data/profile.ts`; o erro mostra arquivo:linha. |
| `npm ci` reclama que `package.json` e `package-lock.json` não batem | Rode `npm install` e faça commit do `package-lock.json`. |

**Na verificação (`scripts/verify-dist.mjs`):**

| Mensagem (trecho) | O que fazer |
|---|---|
| `does not start with /` (ou com a base configurada) | Uma URL foi escrita na mão. Use as funções de `src/i18n/ui.ts` (`pathFor`, `publicationUrl`…) e `src/lib/url.ts` (`assetPath`, `joinBase`). |
| `not found in dist` | Link quebrado: slug renomeado, página removida ou arquivo que não existe. |
| `missing <link rel="alternate" hreflang=…>` | A página não tem o par no outro idioma, ou o par está em outra URL. |
| `"STUB"` / `"TODO"` / `"lorem"` … | Texto provisório esquecido no conteúdo. |
| `"undefined"` / `"NaN"` / `"[object Object]"` | Um valor ausente foi interpolado num texto (ex.: título da 404) ou falta um campo no frontmatter. |
| `no element with id=…` | Link `#âncora` para uma seção que não existe (ou mudou de nome). |
| `phone/WhatsApp links belong only on …` | Telefone e WhatsApp aparecem só na página Sobre e nas páginas do Dev parceiro (lista em `scripts/verify-dist.mjs`). |

**No deploy (aba Actions):**

| Sintoma | O que fazer |
|---|---|
| `Get Pages site failed` em "Configure Pages", ou 404 no deploy | Falta a configuração inicial: Settings → Pages → Source: GitHub Actions. |
| `Branch "…" is not allowed to deploy to github-pages due to environment protection rules` | O deploy só sai da `main`. Faça merge na `main` em vez de publicar de outra branch. |
| Site no ar sem estilo, fontes ou imagens | Alguma URL ficou fora do prefixo do site (`base`). Rode `npm run verify` localmente para achar. |
| A mudança não aparece no ar | Confira se o push foi para a `main` e se o workflow terminou em verde; o Pages pode levar alguns minutos. Recarregue sem cache. |
