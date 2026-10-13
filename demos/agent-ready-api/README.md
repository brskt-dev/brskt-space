# API de onboarding: demonstração do artigo "Sua API funciona para pessoas. E para agentes de IA?"

API fictícia de solicitações de onboarding de clientes, com dados sintéticos e armazenamento em
memória. Serve só para o artigo: não é código de produção nem vem de nenhum sistema real.
Fica separada do site (Astro); aqui é .NET 10.

*English: a fictional customer-onboarding API (synthetic data, in-memory) used by the article. Two
contracts of the same domain (v1 as it grew around a web form, v2 revised for any caller that only
has the contract), automated tests, a small MCP adapter and a small agent experiment with its raw data.*

## O que tem aqui

| Pasta | O quê |
|---|---|
| `src/OnboardingApi` | A API. A configuração `Contract` escolhe o contrato servido: `v1` ou `v2` (um por processo). |
| `src/OnboardingMcp` | Servidor MCP (stdio) com três ferramentas apoiadas na API v2. Usa o SDK oficial de C# (`ModelContextProtocol` 2.2.0). |
| `tests/OnboardingApi.Tests` | Testes de contrato (xUnit). Os do v1 passam de propósito: fixam os problemas que o artigo discute. |
| `experiment` | Protocolo, resultados e dados brutos do experimento com agente. |
| `scripts` | Subir os servidores do experimento, avaliar os logs e testar o adaptador MCP. |

## Rodar

Precisa do SDK do .NET 10 e de Python 3 (só para os scripts).

```bash
dotnet test                                   # 16 testes

# um contrato por processo
Contract=v1 dotnet run --project src/OnboardingApi --urls http://127.0.0.1:5101
Contract=v2 dotnet run --project src/OnboardingApi --urls http://127.0.0.1:5102

curl http://127.0.0.1:5102/openapi/v2.json
curl -X POST http://127.0.0.1:5102/v2/onboarding-requests \
  -H "X-Api-Key: demo-key-acme-0001" -H "Content-Type: application/json" \
  -H "Idempotency-Key: 4b1f0c6e-demo-0001" \
  -d '{"customerLegalName":"Padaria Exemplo Ltda","customerTaxId":"11222333000181","plan":"pro","startDate":"2026-12-01","contactEmail":"ana@exemplo.test"}'
```

As chaves em `appsettings.json` são de demonstração. `demo-key-readonly-0003` só lê, e
`demo-key-other-0002` pertence a outro cliente (para ver o isolamento).
`Faults__DropFirstCreateResponse=true` liga a falha do experimento: a primeira criação de cada chave
é salva e a conexão cai antes da resposta.

O documento OpenAPI fica exposto em qualquer ambiente porque, aqui, ele é parte do contrato que o
agente lê. O template padrão do ASP.NET Core só o expõe em Development; numa API interna, decida isso
de propósito.

### Adaptador MCP

```bash
Contract=v2 dotnet run --project src/OnboardingApi --urls http://127.0.0.1:5302 &
python3 scripts/mcp-stdio-test.py http://127.0.0.1:5302
```

O script fala JSON-RPC com o servidor pelo stdio, na revisão 2026-07-28 do MCP (sem handshake; `server/discover`, `tools/list` e algumas chamadas). Com `--legacy`, usa a revisão 2025-11-25, com `initialize`.
A chave da API vem da configuração do adaptador (`OnboardingApi__ApiKey`), nunca do modelo.

## Experimento

`experiment/PROTOCOL.md` foi escrito antes das execuções; `experiment/RESULTS.md` tem os resultados
e os limites, nas duas rodadas. Dados brutos em `experiment/data/round-1/` e `round-2/`: o log de
auditoria de cada contrato (as leituras feitas depois pelo avaliador estão em `*-evaluator-reads.jsonl`),
os relatos dos agentes, a avaliação objetiva e a lista de ferramentas que cada agente usou. A saída do
teste do adaptador MCP está em `experiment/data/mcp/`.

Para repetir: `scripts/run-experiment-servers.sh`, depois entregue a cada agente a URL, uma chave de
`experiment/local-keys.json`, o endereço do OpenAPI e a tarefa do protocolo; no fim,
`python3 scripts/evaluate-experiment.py experiment/local-logs experiment/local-keys.json experiment/local-eval.json`.
Com 3 execuções por contrato, o resultado mostra como cada contrato falha ou ajuda; não prova que um é
melhor em geral.
