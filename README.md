# brskt-space

Meu espaço pessoal: trajetória, projetos e artigos técnicos, em português e inglês.

**No ar:** https://brskt-dev.github.io/brskt-space/

Feito com [Astro](https://astro.build), saída 100% estática (sem JavaScript no navegador, fora o
redirecionamento de idioma da página inicial). Cada push na branch `dev` gera, verifica e publica o
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
| `src/data/profile.ts` | Dados do currículo: contatos, experiência, competências, formação, idiomas. |
| `src/i18n/ui.ts` | Textos da interface (menu, rodapé, rótulos de status e tipo), nomes das rotas e funções de URL. |
| `src/lib/url.ts` | Montagem de URLs com o prefixo `/brskt-space/`. |
| `src/lib/publications.ts` | Validação das publicações no build (par pt/en, campos iguais). |
| `src/content.config.ts` | Regras do frontmatter: tipos, valores de `status`, formato de data. Um status novo também precisa do rótulo `status.*` em `src/i18n/ui.ts` (sem ele, aparece o valor cru). |
| `src/pages/[lang]/[...path].astro` e `src/lib/routes.ts` | Geram todas as páginas `/pt/` e `/en/` e o `sitemap.xml`; o conteúdo de cada página fica em `src/components/views/`. Não crie arquivos em `src/pages/pt/` ou `src/pages/en/`: eles ficam fora do sitemap e do menu. |
| `src/assets/` | Foto (otimizada no build). |
| `src/components/`, `src/layouts/`, `src/styles/` | Visual e corpo das páginas (`views/`). Cores (tema escuro) em `src/styles/global.css`. |
| `public/` | Arquivos copiados sem mudança, como `favicon.svg`. |
| `templates/publication/` | Modelos para novas publicações. Ficam fora de `src/` e nunca vão para o site. |
| `scripts/verify-dist.mjs` | Verificação do site gerado: links, prefixo `/brskt-space/`, metadados, idiomas. |
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
| `type` | sim | `product` (produto), `experiment` (experimento) ou `article` (artigo). Produtos e experimentos aparecem em Projetos; artigos, em Artigos. |
| `title` | sim | Título da página e dos cards. |
| `summary` | sim | Uma ou duas frases. Vai nos cards e na meta description. |
| `date` | sim | Dia em que entra no site, `AAAA-MM-DD` (ex.: `2026-10-01`). Outro formato, como `01/10/2026`, faz o build falhar. |
| `updated` | não | Dia da última atualização relevante, `AAAA-MM-DD`. |
| `status` | em product e experiment | `in-development`, `live`, `paused`, `archived`. Experimentos também aceitam `running` e `concluded`. Em artigos, apague a linha. |
| `tags` | não | Palavras-chave curtas, no idioma de cada arquivo. |
| `links` | não | Só links reais (site no ar, repositório, demo). Nunca link provisório. |
| `cover` | não | Imagem de capa na mesma pasta, por exemplo `./cover.png`. Só se a imagem existir. |
| `draft` | não (padrão: `false`) | `true` = rascunho, fica fora do site. `false` ou sem a linha = publicada. Os modelos começam em `true`, então apagar a linha publica. |

`type`, `date`, `updated`, `status` e `draft` precisam ser **iguais** em `pt.md` e `en.md`. Título, resumo, tags e texto
são traduzidos.

**4. Escreva o texto** em Markdown, abaixo do frontmatter. O modelo traz um roteiro de seções para cada tipo:
mantenha só o do seu tipo e apague o resto (e os comentários `<!-- -->`). Use `##` e `###` para seções; o
título da página já é o `h1`.

**5. Imagens** ficam na mesma pasta da publicação: `![descrição da imagem](./print-da-tela.png)`. O Astro
otimiza no build. Sempre escreva a descrição (é o texto alternativo).

**6. Confira:** `npm run dev` e abra a página. Enquanto `draft: true`, ela não aparece; mude para `false` nos
dois arquivos para ver. Antes do push, rode `npm run verify`.

**7. Publique:** commit e push na `dev`. A seção (Projetos ou Artigos) aparece sozinha no menu quando
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
  `tagline`, `availability` (linha de disponibilidade) e `focus` (lista de áreas, cada uma com `title` e
  `text`). O texto abaixo do frontmatter é o parágrafo de introdução.
- **Sobre:** `src/content/pages/about/{pt,en}.md`. Frontmatter com `title` e `description`; o texto abaixo é a
  narrativa.
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
npm run dev       # servidor local em http://localhost:4321/brskt-space/
npm run check     # checagem de tipos: acusa texto sem tradução em src/i18n/ui.ts e src/data/profile.ts
npm run verify    # checagem de tipos + build de produção + verificação (o mesmo que o deploy roda)
npm run preview   # serve o build da pasta dist/ em http://localhost:4321/brskt-space/
```

O endereço local inclui `/brskt-space/`; `http://localhost:4321/` sozinho dá 404.

`npm run verify` falha (e lista o que corrigir) se encontrar link quebrado, URL sem o prefixo
`/brskt-space/`, página sem título, `h1`, descrição ou canonical, página sem o par no outro idioma, link
`#âncora` para um id inexistente, telefone fora da página Sobre, ou texto de rascunho no HTML (`STUB`,
`TODO`, `FIXME`, `lorem ipsum`, `undefined`, `NaN`, `[object Object]`). Blocos de código são ignorados nessa
última checagem. Para testar também os links externos (só avisa, não falha):

```sh
node scripts/verify-dist.mjs --external
```

## Deploy

1. Push na branch `dev` (ou, em **Actions → Deploy to GitHub Pages → Run workflow**, para rodar na mão).
2. O GitHub Actions roda `npm ci` e `npm run verify` (checagem de tipos + build + verificação).
3. Se tudo passar, envia a pasta `dist/` e publica em https://brskt-dev.github.io/brskt-space/.
4. Se algo falhar, **nada é publicado** e o site continua na versão anterior. O erro aparece na aba
   **Actions**, no passo "Build and verify".

**Só na primeira vez** (no repositório, nesta ordem):

1. **Settings → General → Default branch:** troque `main` por `dev`. O botão *Run workflow* só aparece para
   workflows que estão na branch padrão, e o ambiente `github-pages` que o GitHub cria só aceita deploy dela.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Em **Actions**, abra a última execução que falhou e clique em **Re-run all jobs** (ou faça um push na `dev`).
   Se o deploy reclamar de `environment protection rules`, veja [Problemas comuns](#problemas-comuns).

## Mapa de URLs

Os caminhos abaixo vêm depois de `https://brskt-dev.github.io/brskt-space`.

| Página | Português | English |
|---|---|---|
| Escolha de idioma | `/` (redireciona pelo idioma do navegador; sem JS, mostra os dois links) | (mesma) |
| Início | `/pt/` | `/en/` |
| Sobre | `/pt/sobre/` | `/en/about/` |
| Projetos (lista) | `/pt/projetos/` | `/en/projects/` |
| Projeto | `/pt/projetos/<slug>/` | `/en/projects/<slug>/` |
| Artigos (lista) | `/pt/artigos/` | `/en/articles/` |
| Artigo | `/pt/artigos/<slug>/` | `/en/articles/<slug>/` |
| Página não encontrada | `/404.html` (bilíngue) | (mesma) |
| Sitemap e robots | `/sitemap.xml`, `/robots.txt` | (mesmos) |

Os buscadores só leem o `robots.txt` da raiz do domínio (`https://brskt-dev.github.io/robots.txt`), então o
`/brskt-space/robots.txt` (e a linha `Sitemap:` dele) só passa a valer com domínio próprio. Até lá, para os
buscadores acharem o sitemap, envie `https://brskt-dev.github.io/brskt-space/sitemap.xml` no Google Search
Console, numa propriedade do tipo "Prefixo do URL" com `https://brskt-dev.github.io/brskt-space/`.

De onde vem cada parte:

- `brskt-dev.github.io` e `/brskt-space`: constantes `SITE` e `BASE` no topo de `astro.config.mjs`.
- `pt` / `en`: os dois idiomas do site.
- `sobre`, `projetos`, `artigos` (e os nomes em inglês): `segments` em `src/i18n/ui.ts`. Trocar um nome
  muda a URL de todas as páginas daquela seção.
- `<slug>`: o nome da pasta em `src/content/publications/`.
- Projetos e Artigos só existem quando há pelo menos uma publicação daquele tipo.

## Domínio próprio (mais tarde)

1. **No GitHub primeiro:** Settings → Pages → Custom domain, digite o domínio e salve. (Configurar o DNS antes
   disso permite que outra pessoa use o seu subdomínio no GitHub Pages.)
2. **DNS:**
   - subdomínio (ex.: `www.seudominio.com`): registro `CNAME` apontando para `brskt-dev.github.io`;
   - domínio raiz (ex.: `seudominio.com`): registros `A` para `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153` e `185.199.111.153` (e, se quiser IPv6, `AAAA` para `2606:50c0:8000::153`,
     `2606:50c0:8001::153`, `2606:50c0:8002::153` e `2606:50c0:8003::153`).
   - A propagação pode levar até 24 h. Depois, marque **Enforce HTTPS**.
3. **No código:**
   - `astro.config.mjs`: constantes `SITE` e `BASE` no topo, `SITE = 'https://seudominio.com'` e `BASE = '/'`
     (elas valem para `site`, `base` e o plugin que marca links externos no Markdown);
   - `scripts/verify-dist.mjs`: constantes `SITE` e `BASE` no topo, com os mesmos valores;
   - troque os valores reserva que sobram com o endereço antigo: `grep -rn "brskt-dev.github.io" src`
     (`SITE_ORIGIN` em `src/lib/url.ts` e os `?? '…'` em `BaseHead.astro`, `robots.txt.ts` e `sitemap.xml.ts`);
   - `public/CNAME` com uma linha só, o domínio. É opcional: com deploy por GitHub Actions, o GitHub usa o
     domínio salvo em Settings e ignora esse arquivo, mas ele deixa o domínio registrado no repositório.
4. Apague `node_modules/.astro` (depois de mudar o plugin ou o domínio, esse cache guarda o Markdown já
   renderizado com o endereço antigo), rode `npm run verify` e faça o push. As URLs passam a ser `https://seudominio.com/pt/…`, sem `/brskt-space`.

## Problemas comuns

**No build (`npm run dev`, `npm run build` ou `npm run verify`):**

| Mensagem (trecho) | O que fazer |
|---|---|
| `[publications] Publication "x" is missing …/x/en.md` | Falta a tradução. Crie o arquivo ou deixe `draft: true` no que existe. |
| `pt.md and en.md disagree on type / date / updated / status` | Deixe esses campos iguais nos dois arquivos. |
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
| `does not start with /brskt-space/` | Uma URL foi escrita na mão. Use as funções de `src/i18n/ui.ts` (`pathFor`, `publicationUrl`…) e `src/lib/url.ts` (`assetPath`, `joinBase`). |
| `not found in dist` | Link quebrado: slug renomeado, página removida ou arquivo que não existe. |
| `missing <link rel="alternate" hreflang=…>` | A página não tem o par no outro idioma, ou o par está em outra URL. |
| `"STUB"` / `"TODO"` / `"lorem"` … | Texto provisório esquecido no conteúdo. |
| `"undefined"` / `"NaN"` / `"[object Object]"` | Um valor ausente foi interpolado num texto (ex.: título da 404) ou falta um campo no frontmatter. |
| `no element with id=…` | Link `#âncora` para uma seção que não existe (ou mudou de nome). |
| `phone/WhatsApp links belong only on …` | Telefone e WhatsApp aparecem só na página Sobre. |

**No deploy (aba Actions):**

| Sintoma | O que fazer |
|---|---|
| `Get Pages site failed` em "Configure Pages", ou 404 no deploy | Falta a configuração inicial: Settings → Pages → Source: GitHub Actions. |
| `Branch "dev" is not allowed to deploy to github-pages due to environment protection rules` | Settings → Environments → `github-pages` → libere a branch `dev`. |
| Site no ar sem estilo, fontes ou imagens | Alguma URL ficou sem o prefixo `/brskt-space/`. Rode `npm run verify` localmente para achar. |
| A mudança não aparece no ar | Confira se o push foi para a `dev` e se o workflow terminou em verde; o Pages pode levar alguns minutos. Recarregue sem cache. |
