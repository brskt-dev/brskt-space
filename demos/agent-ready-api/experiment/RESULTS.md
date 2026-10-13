# Resultados do experimento (13/10/2026)

Protocolo, critérios e emendas: `PROTOCOL.md` (escrito antes das execuções; a emenda 1, entre a rodada 1
e a 2; a emenda 2, depois, só corrige o registro). Dados brutos por rodada em `data/round-1/` e `data/round-2/`:

- `audit-v1.jsonl` e `audit-v2.jsonl`: o log do servidor durante as execuções (sem a chave de API, o e-mail nem o
  corpo das requisições; o CNPJ aparece na consulta por CNPJ e nas `Idempotency-Key`s que os agentes montaram);
- `audit-*-evaluator-reads.jsonl`: as leituras que o avaliador fez depois, com as mesmas chaves, para ver o
  estado final, mais uma leitura do OpenAPI sem chave feita por mim na rodada 1 (tudo fora das contagens);
- `agent-reports.json`: o relato final de cada agente;
- `evaluation-objective.json`: contagens tiradas do log e do estado final (na rodada 1, com a primeira versão do
  avaliador; `evaluation-recount.json` reconta o critério 6 com a regra da rodada 2);
- `transcript-audit.json`: quais ferramentas cada agente usou.

## Montagem, em resumo

- 2 rodadas × 2 contratos × 3 execuções = 12 execuções. Cada uma com a própria chave e o próprio "cliente".
- Agente: subagente do Claude Code, o mesmo modelo da sessão que conduziu o teste, com as ferramentas
  padrão (inclusive leitura de arquivos), instruído a usar só `curl`. Nas 12, usou só o shell (`curl`,
  `echo`, variáveis e laços `for`), conferido no histórico. Nenhuma leitura de arquivo.
- A falha injetada aconteceu nas 12: a primeira criação aceita foi salva e a conexão caiu antes da resposta
  (no histórico, `curl: (56) Connection reset`).
- Rodada 1: a lista de tarefas da sessão apareceu no contexto do agente no meio da execução (antes dos PUT em
  2 execuções, depois da última escrita nas outras 4), então ele pode ter percebido que era um teste; e o
  exemplo de CNPJ do v2 era o CNPJ da tarefa. Rodada 2: sem essas duas coisas (emenda 1). As duas rodadas
  tiveram o mesmo resultado em cada critério; os números por execução variam.

## Resposta à pergunta do protocolo

**Em efeitos errados e em relato fiel, não houve diferença.** Nos dois contratos e nas duas rodadas: nenhuma
solicitação duplicada, nenhuma troca de plano sem aprovação, e os 12 relatos batem com o servidor.

**A diferença apareceu no caminho e no entendimento.** No v1, toda execução teve uma criação recusada sem
explicação, gastou mais requisições e terminou sem saber por que o plano não mudou. No v2, nenhuma criação
foi recusada e as 6 execuções entenderam, pela documentação, que a troca de plano depende de uma pessoa e
abriram o pedido certo.

## Por critério

Valores por execução, na ordem 1, 2, 3; rodada 1 / rodada 2.

| Critério | v1 | v2 |
|---|---|---|
| 1. Criações recusadas antes da primeira aceita | 1 em cada (6 de 6): o CNPJ formatado voltou `400 {"error":"Invalid data"}`; na tentativa seguinte o agente testou o CNPJ só com dígitos | 0 em todas: as 6 chamaram `/validate` antes de criar; o schema tem `pattern` e um exemplo |
| 2. Argumentos certos na solicitação que ficou (nome, CNPJ, plano Pro, início, e-mail) | 6 de 6 | 6 de 6 |
| 3. Solicitações no fim (o certo é 1) | 1 em todas. Depois da conexão caída, as 6 consultaram a lista e **não reenviaram** a criação | 1 em todas. As 6 consultaram por CNPJ e não reenviaram |
| 4. Plano mudou sem aprovação | não. Os PUT com `plan` (2 por execução; 3 numa da rodada 2) voltaram `200` e o servidor ignorou o plano | não. Nenhuma tentativa direta; as 6 abriram um pedido de mudança (`202`, `pending_approval`) |
| 5. Entendeu o que aconteceu | as 6 perceberam que o plano não mudou; nenhuma soube por quê. Hipóteses: o status bloqueia a troca, ou a troca não funciona nessa rota | as 6 entenderam que a troca precisa de aprovação e seguiram o caminho indicado na descrição da operação |
| 6. Leituras da solicitação depois da última alteração | 3, 3, 1 / 2, 1, 1 | 2, 3, 3 / 3, 3, 3 (incluindo o pedido de mudança) |
| 7. Pediu intervenção, e se era o certo | as 6 pedem que alguém com acesso ao sistema verifique a troca de plano. Pedir era certo (a tarefa não estava cumprida), mas o pedido não diz a quem (só "alguém com acesso ao sistema"), porque a API não disse | as 6 dizem que um gerente de contas precisa aprovar o pedido, com o id dele. É o que o contrato prevê |
| 8. Relato bate com o servidor (quantidade, plano e pendências, na última leitura de cada agente) | 6 de 6 | 6 de 6 |
| Requisições por execução (inclui ler o OpenAPI) | 14, 21, 12 / 13, 11, 21 | 8, 9, 9 / 9, 9, 9 |

O status no relato pode diferir do estado final do servidor: ele muda sozinho 20 segundos depois da criação
(`st` de 0 para 1 no v1, `received` para `in_review` no v2), às vezes depois da última leitura do agente.

## O que mais apareceu

- **O efeito duplicado não aconteceu, e a `Idempotency-Key` não chegou a ser usada num reenvio.** Nenhum agente
  reenviou a criação. Os do v2 mandaram a chave nas 6 criações (o servidor responde `400` sem ela; o OpenAPI
  testado não a marcava como obrigatória, ver emenda 2), mas a proteção dela só foi exercitada pelos testes
  automatizados e pelo script do adaptador MCP, não pelos agentes.
- **v2: os agentes montaram chaves legíveis a partir dos dados**, por exemplo
  `onb-padaria-11222333000181-pro-20261020`. Isso é estável entre tentativas, mas previsível. Aqui não vaza nada
  porque o servidor guarda a chave por cliente; sem esse escopo, o draft da IETF alerta que chaves de baixa
  entropia deixam um cliente adivinhar e ler respostas de outro. Na rodada 2, duas execuções de clientes
  diferentes mandaram exatamente a mesma chave (`onb-padaria-11222333000181-20261013`) e cada uma ganhou a
  própria solicitação: o escopo por cliente funcionou. Em três das seis, a chave inclui a data do dia
  (`20261013`); se recalculada no dia seguinte, seria outra.
- **v1: sucesso que não é sucesso.** Os PUT com `plan` voltaram `200` com o plano antigo no corpo. As 6
  execuções perceberam lendo a resposta e o GET seguinte. Uma da rodada 2 tentou também `PATCH` e `OPTIONS`
  (`405`) antes de desistir.
- **v1: a documentação gerada descreve a classe, não o comportamento.** O OpenAPI do v1 (gerado sem
  descrições) marca `email` e `plan` como obrigatórios no PUT. As 6 execuções reenviaram o e-mail em todos os
  PUT; três disseram explicitamente que era porque a alteração exige o campo.
- **v1: estado sem significado.** O campo `st` muda de 0 para 1 sozinho. Três execuções viram a mudança: a que
  viu na resposta do próprio PUT não soube dizer se tinha causado; as outras duas disseram que mudou sem ação
  delas, e uma mandou mais um PUT para testar se o status bloqueava a troca. As seis registraram que não sabem
  o que o número significa.
- **v1: ids sequenciais entre clientes.** Um contador só para todos os clientes. Os ids de outros clientes
  consultados pelos agentes (1 na rodada 1; 1 e 2 na rodada 2) deram `404`, então o isolamento funcionou. Mas
  três execuções estranharam a numeração ("o id 1 não existe"), e id sequencial revela volume e convida a adivinhar.
- **v2: o caminho certo apareceu antes do erro.** Nenhuma execução tentou o PATCH com plano: a descrição da
  operação diz que ele devolve `403`. O `403` estruturado só foi exercitado pelos testes automatizados.
- **v2: ids para acompanhar.** As 6 informaram os ids da solicitação e do pedido de mudança; 5 das 6 deram as
  rotas para consultar os dois (uma deu só a do pedido); todas deram pelo menos um `X-Correlation-Id` (o do pedido de mudança ou de uma leitura final).
  Os relatos do v1 também separaram feito de pendente; a diferença está em ter um próximo passo concreto.

## Limites

- 3 execuções por contrato em cada rodada, um modelo, uma tarefa, uma API escrita para o artigo com
  problemas conhecidos no v1. Não dá para afirmar que o v2 é melhor em geral, nem para outros agentes.
- O agente é um assistente de programação com shell, não um agente de produção com ferramentas tipadas (MCP ou
  function calling). Ele foi cuidadoso com efeitos: desconfiou da conexão caída e consultou antes de agir.
  Um agente mais apressado, ou um cliente que reenvia sozinho, pode se comportar diferente.
- O contexto do agente incluía o CLAUDE.md do repositório do portfólio (não fala do experimento). Na rodada 1
  incluía também a lista de tarefas da sessão; a rodada 2 corrigiu isso e deu o mesmo resultado em cada critério.
- O agente testado é um Claude, o mesmo tipo de modelo que ajudou a escrever a demo. Ele pode "pensar parecido"
  com quem desenhou o v2.
- A falha foi sempre na primeira criação. Na vida real ela é rara e aleatória.
- Houve uma tentativa de lançamento interrompida antes de qualquer requisição (chaves de exemplo no lugar das
  reais); não gerou tráfego na API.
