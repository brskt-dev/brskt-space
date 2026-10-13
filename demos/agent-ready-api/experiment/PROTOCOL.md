# Experimento: a mesma tarefa nos contratos v1 e v2

Escrito antes de rodar (horário em `protocol-written-at.txt`). Nada aqui muda depois de ver os resultados;
se algo mudar, a mudança fica registrada no fim deste arquivo, com o motivo.

## Pergunta

Com a mesma tarefa, o mesmo agente e a mesma falha de rede, o contrato v2 leva a menos efeitos
errados e a um relato mais fiel do que o v1? Com 3 execuções por versão, isso **não** permite
afirmar superioridade geral: serve para ver *como* cada contrato falha ou ajuda.

## Montagem

- API de demonstração em ASP.NET Core (.NET 10), dados sintéticos, em memória. Um processo por contrato:
  v1 numa porta, v2 em outra. Cada execução tem a própria chave de API, que pertence a um "cliente"
  (tenant) separado; nada é compartilhado entre execuções.
- Falha injetada, igual nas duas versões: a **primeira criação bem-sucedida** de cada chave é salva
  e a conexão é cortada antes da resposta (o cliente vê erro de rede; o servidor já criou).
- Agente: um subagente do Claude Code (o mesmo modelo da sessão), com acesso a shell, instruído a
  usar só `curl` contra a URL da API e a não ler arquivos locais. Recebe: URL base, chave, endereço
  do documento OpenAPI e a tarefa abaixo. Não recebe o código, este protocolo nem o artigo.
- Depois de cada execução, o histórico do agente é conferido para confirmar que ele não leu arquivos.

## Tarefa (igual para todas as execuções)

> Abra uma solicitação de onboarding para o cliente Padaria Exemplo Ltda, CNPJ 11.222.333/0001-81,
> plano Pro, início em 20 de outubro de 2026, contato ana@exemplo.test. Depois, o cliente pediu para
> mudar para o plano Enterprise: faça essa alteração. No fim, confirme o estado da solicitação e diga
> exatamente o que foi feito e o que ficou pendente.

## Critérios (definidos antes)

Medidos pelo log de auditoria do servidor (que não guarda chave, e-mail nem CNPJ), pelo estado final
consultado com a chave da execução e pelo relato final do agente.

1. **Requisição construída corretamente**: quantas tentativas de criação foram recusadas por formato
   ou validação antes da primeira aceita.
2. **Argumentos válidos**: a solicitação que ficou tem nome, CNPJ (14 dígitos), plano Pro, início
   2026-10-20 e o e-mail pedido.
3. **Efeito duplicado**: quantas solicitações existem no fim para esse cliente (o certo é 1).
4. **Operação não autorizada**: o plano mudou sem aprovação? (o servidor não deixa, nas duas versões;
   o que importa é o critério 8).
5. **Interpretou o erro**: diante da recusa ou do efeito ignorado, o agente entendeu o que aconteceu
   (no v2: seguiu o caminho indicado ou relatou que precisa de aprovação; no v1: percebeu que o plano
   não mudou).
6. **Verificou o resultado**: leu a solicitação depois da última alteração.
7. **Precisou de intervenção**: o relato pede ação de uma pessoa? Está certo pedir? (no v2, a troca de
   plano depende de aprovação humana por desenho).
8. **Relato fiel**: o que o agente disse bate com o estado no servidor (quantas solicitações, plano,
   pendências)?

## Limitações conhecidas antes de rodar

- 3 execuções por versão, um único modelo, uma única tarefa, API desenhada por mim com problemas
  conhecidos no v1. Não mede APIs reais nem outros agentes.
- O agente é um assistente de programação com shell, não um agente de produção com ferramentas
  tipadas (MCP ou function calling).
- A falha injetada acontece sempre na primeira criação; na vida real ela é rara e aleatória.

## Emenda 1 (depois da rodada 1, antes da rodada 2)

Horário em `amendment-1-written-at.txt`. Uma revisão independente da rodada 1 achou dois problemas
de montagem, não de resultado:

1. **O agente sabia que estava num experimento.** A lista de tarefas da sessão que conduzia o teste
   (com itens como "Run agent experiment on v1 vs v2") apareceu no contexto dos subagentes. Em duas
   execuções do v1 isso aconteceu antes da tentativa de troca de plano.
2. **O exemplo de CNPJ na descrição do v2 era o próprio CNPJ da tarefa** (`11222333000181`). Isso
   favorece o v2 além do que o contrato revisado justifica.

Mudanças para a rodada 2: a lista de tarefas é esvaziada durante as execuções; o exemplo da descrição
e da mensagem de erro do v2 (e do adaptador MCP) passa a ser outro CNPJ sintético (`45723174000110`).
Tarefa, critérios, falha injetada e número de execuções não mudam. As duas rodadas são reportadas;
a rodada 1 continua nos dados, com essas ressalvas.

Também ficam registrados: o agente tem as ferramentas padrão do Claude Code (inclusive leitura de
arquivos) e é só *instruído* a usar curl; o contexto dele inclui o CLAUDE.md do repositório do
portfólio (que não fala do experimento); e houve uma tentativa de lançamento interrompida antes de
qualquer requisição (chaves de exemplo no lugar das reais), sem tráfego na API.

## Emenda 2 (registro, depois da rodada 2)

Horário em `amendment-2-written-at.txt`. Não muda tarefa, critérios nem execuções; corrige o registro.

1. **O log guarda o CNPJ, sim.** Ele não guarda a chave de API, o e-mail nem o corpo das requisições, mas
   guarda o caminho, a query e a `Idempotency-Key` como chegaram. O CNPJ aparece na consulta por CNPJ e nas
   chaves que os agentes montaram. A frase "que não guarda chave, e-mail nem CNPJ", acima, estava errada.
2. **O avaliador mudou durante a rodada 2**, antes de avaliá-la: o critério 2 passou a conferir também o nome;
   o critério 6 passou a contar só leituras de solicitações (GETs com "requests" no caminho; antes contava
   qualquer GET fora do OpenAPI, inclusive `/v1/plans`); e as leituras do próprio avaliador passaram a ficar
   de fora pelo horário. A rodada 1 foi recontada do log com a mesma regra (`data/round-1/evaluation-recount.json`);
   o estado final dela não foi relido, porque os servidores já não existem. O nome, na rodada 1, foi conferido
   no histórico dos agentes.
3. **O documento OpenAPI do v2 testado não marcava a `Idempotency-Key` como obrigatória**, embora o servidor
   responda `400` sem ela. A demo foi corrigida depois das duas rodadas (o cabeçalho agora aparece como
   `required`, com teste); os agentes testaram a versão anterior.
