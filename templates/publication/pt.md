---
# Modelo de publicação: versão em PORTUGUÊS. O par em inglês é en.md, nesta mesma pasta.
#
# Como usar:
#   1. Copie pt.md e en.md para src/content/publications/<slug>/
#      O nome da pasta é o slug: entra na URL dos dois idiomas, por exemplo
#      /pt/projetos/<slug>/ e /en/projects/<slug>/. Use só letras minúsculas, números e hífens.
#   2. Preencha os dois arquivos. type, date, status e draft precisam ser IGUAIS em pt.md e en.md.
#   3. Quando os dois idiomas estiverem prontos, mude draft para false nos dois.
#
# Tipo (igual nos dois idiomas):
#   product    → produto; aparece em Projetos (/pt/projetos/)
#   experiment → experimento; aparece em Projetos (/pt/projetos/)
#   article    → artigo técnico; aparece em Artigos (/pt/artigos/)
type: product

# Título da página, dos cards e da aba do navegador.
title: "Nome da publicação"

# Uma ou duas frases. Aparece nos cards e vira a meta description (busca e prévia de links).
summary: "Uma ou duas frases sobre o que é e para quem é."

# Dia em que a publicação entra no site, no formato AAAA-MM-DD (igual nos dois idiomas).
date: 2026-10-01

# Opcional: dia da última atualização relevante (AAAA-MM-DD). Tire o # para usar.
# updated: 2026-10-15

# Estado atual (igual nos dois idiomas). Obrigatório em product e experiment.
# Em article, apague esta linha.
#   product:    in-development | live | paused | archived
#   experiment: in-development | live | paused | archived | running | concluded
status: in-development

# Opcional: palavras-chave curtas, escritas no idioma deste arquivo. Ex.: ["SaaS B2B", "Onboarding"]
tags: []

# Opcional: só links que existem de verdade (site no ar, repositório, demo). Nunca link provisório.
# Formato: um item por link, por exemplo
#   links:
#     - { label: "Site", url: "https://endereco-real.com" }
links: []

# Opcional: imagem de capa salva nesta mesma pasta. Use só se a imagem existir.
# cover: ./cover.png

# true  → rascunho: a publicação fica fora do site (nos dois idiomas).
# false → publicada. Precisa estar igual em pt.md e en.md.
draft: true
---

<!--
  Corpo em Markdown. Primeira pessoa, frases curtas, só fatos reais
  (nada de métricas, clientes ou resultados que não existam).

  Abaixo há um roteiro para cada tipo. Mantenha só o bloco do seu tipo
  (product, experiment ou article), apague os outros blocos e apague estes comentários.

  - Use ## para seções e ### para subseções (o título da página já é o h1).
  - Imagem: salve na mesma pasta e escreva ![descrição da imagem](./nome-da-imagem.png)
  - Código: bloco com três crases e a linguagem, por exemplo ```csharp
-->

<!-- ===== product ===== -->

## O problema

<!-- Que situação o produto resolve e para quem. -->

## Como funciona

<!-- O fluxo principal, em poucos passos. -->

## Em que pé está

<!-- Fase atual e próximos passos. -->

<!-- ===== experiment ===== -->

## A pergunta

<!-- O que eu quis descobrir. -->

## Como testei

<!-- Montagem, ferramentas e critérios de comparação. -->

## O que observei

<!-- Só resultados medidos. Se ainda não há, diga que o experimento está em andamento. -->

## Conclusões

<!-- O que muda na prática a partir disso. -->

<!-- ===== article ===== -->

## Contexto

<!-- O cenário e por que o assunto importa. -->

## O que eu fiz

<!-- A solução, com trechos de código quando ajudarem. -->

## O que aprendi

<!-- Trade-offs e o que eu faria diferente. -->
