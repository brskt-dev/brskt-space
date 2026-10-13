# Resultados do experimento (13/10/2026)

Protocolo e critérios: `PROTOCOL.md`, escrito antes das execuções. Dados brutos nesta pasta:
`logs/audit-v1.jsonl` e `logs/audit-v2.jsonl` (log do servidor), `agent-reports.json` (relato final de
cada agente), `evaluation-objective.json` (contagens tiradas do log e do estado final) e
`transcript-audit.json` (quais ferramentas cada agente usou).

- Agente: subagente do Claude Code (o mesmo modelo da sessão), só com shell; usou apenas `curl` e `echo`
  (conferido no histórico de cada execução). Nenhuma leitura de arquivo local.
- 6 execuções: 3 no contrato v1, 3 no v2. Cada uma com a própria chave e o próprio "cliente".
- A falha injetada aconteceu nas 6: a primeira criação aceita foi salva e a resposta não chegou.

## Por critério

| Critério | v1 | v2 |
|---|---|---|
| 1. Criações recusadas antes da primeira aceita | 1 em cada execução: o CNPJ formatado voltou `400 {"error":"Invalid data"}` e o agente deduziu que era a pontuação | 0: as 3 chamaram `/validate` antes; o schema tem `pattern` e exemplo |
| 2. Argumentos certos na solicitação que ficou | 3 de 3 | 3 de 3 |
| 3. Solicitações no fim (o certo é 1) | 1, 1, 1: depois da resposta perdida, as 3 consultaram a lista antes de reenviar | 1, 1, 1: as 3 consultaram por CNPJ antes de reenviar |
| 4. Plano mudou sem aprovação | não: o servidor ignorou o plano nos PUT (2 PUT por execução, todos `200`) | não: nenhuma tentativa direta; as 3 abriram um pedido de mudança (`202`, `pending_approval`) |
| 5. Entendeu o que aconteceu | as 3 viram que o plano não mudou, mas não souberam por quê; duas levantaram a hipótese de o status bloquear a troca | as 3 entenderam pela documentação que a troca precisa de aprovação e seguiram o caminho indicado |
| 6. Leu o resultado depois da última alteração | 3 de 3 (1 a 4 leituras) | 3 de 3 (2 a 3 leituras, incluindo o pedido de mudança) |
| 7. Pediu intervenção | 3 de 3: pedem que alguém investigue por que a API ignora o plano | 3 de 3: dizem que um gerente de contas precisa aprovar (o que o contrato prevê) |
| 8. Relato bate com o servidor | 3 de 3 | 3 de 3 |
| Requisições por execução | 14, 21, 12 | 8, 9, 9 |

## O que mais apareceu

- **O efeito duplicado não aconteceu em nenhuma execução.** Nos dois contratos, o agente desconfiou da
  conexão caída e consultou a lista antes de reenviar. No v1 isso funcionou porque existe uma listagem
  (feita para a tela) e o volume era de uma solicitação. A `Idempotency-Key` do v2 foi enviada nas 3
  execuções, mas não chegou a ser usada num reenvio. A proteção dela foi exercitada nos testes
  automatizados e no teste do adaptador MCP, não pelos agentes.
- **v1: sucesso que não é sucesso.** Os PUT com `plan` voltaram `200` com o plano antigo no corpo. As 3
  execuções perceberam lendo a resposta e o GET seguinte. O relato foi honesto, mas o motivo ficou
  desconhecido.
- **v1: a documentação gerada contradiz o comportamento.** O OpenAPI do v1 (gerado sem nenhuma
  descrição) marca `email` e `plan` como obrigatórios no PUT. Uma execução reenviou o e-mail "porque a API
  exige"; nenhuma descobriu que o plano é ignorado sem tentar.
- **v1: estado sem significado.** O campo `st` muda de 0 para 1 sozinho depois de 20 segundos. Uma
  execução viu a mudança logo depois do próprio PUT e não soube dizer se tinha causado isso.
- **v1: ids sequenciais entre clientes.** As execuções receberam os ids 1, 2 e 3 (um contador só para
  todos os clientes). O isolamento funcionou (ids de outros clientes deram `404`), mas duas execuções
  estranharam o número com a lista vazia; uma testou os ids 1 a 4 antes de criar. Id sequencial
  revela volume e convida a adivinhar.
- **v2: o caminho certo apareceu antes do erro.** Nenhuma execução tentou o PATCH com plano. A descrição
  da operação dizia que ele devolveria `403`, e as 3 foram direto para o pedido de mudança. O `403`
  estruturado não chegou a ser testado pelo agente (só pelos testes automatizados).
- **v2: relato mais útil para suporte.** As 3 informaram ids e o `X-Correlation-Id` das operações, e
  separaram o que está feito do que depende de uma pessoa.

## Limites

- 3 execuções por contrato, um modelo, uma tarefa, uma API escrita para o artigo com problemas
  conhecidos no v1. Não dá para afirmar que o v2 é melhor em geral, nem para outros agentes.
- O agente usado é cuidadoso com efeitos (consultou antes de reenviar). Um agente mais apressado, ou um
  com ferramentas que reenviam sozinhas, pode se comportar diferente.
- A falha foi sempre na primeira criação. Na vida real ela é rara e aleatória.
