---
type: article
title: "Quando a interface vira integração: de rotinas gravadas a agentes de IA"
summary: "Um agente desktop que reserva contas, abre sessões isoladas e executa rotinas sobre sistemas de terceiros sem API. As decisões difíceis por trás dele, os limites que ficaram e como eu levaria essa ideia para agentes de IA sem entregar o volante ao modelo."
date: 2026-10-05
tags: ["Arquitetura", ".NET", "WebView2", "SQL Server", "Automação", "Agentes de IA"]
---

Imagine uma pessoa em atendimento que, para resolver uma única demanda, precisa entrar em três ou quatro sistemas de terceiros. Cada um tem a sua conta, a sua tela de login e o seu jeito de fazer as coisas. Alguns são aplicações web que não oferecem API nenhuma. As contas são compartilhadas e em número limitado, então alguém precisa saber qual está livre, qual é a senha e como se faz aquele procedimento que só quem passou pelo treinamento lembra.

Desenvolvi um desenho para esse cenário: um agente desktop que abre essas plataformas dentro de sessões controladas, faz o login sozinho e executa rotinas cadastradas como dados. Este texto conta a ideia, as decisões que mais deram trabalho, o que ela **não** resolve e para onde eu levaria esse conceito com IA.

Para não misturar as coisas, separei o artigo em três camadas: **o que foi implementado**, **a análise dos limites** e **as expansões que proponho e que não existem no sistema**.

## O problema não era só o login

À primeira vista, parece um problema de senha. Não é. Os sintomas eram quatro:

- **Contas compartilhadas e limitadas.** Várias pessoas, poucas contas, nenhuma noção clara de quem está usando o quê.
- **Login manual repetido.** Digitar usuário e senha a cada acesso, com a senha circulando por mais lugares do que deveria.
- **Atribuição difícil.** Quando uma conta compartilhada é usada, fica complicado dizer quem a usou e em qual atendimento.
- **Procedimento na memória.** O passo a passo de cada sistema vivia em treinamento, anotação e mensagem antiga.

O caminho óbvio seria integrar por API. E, quando existe uma API adequada, ele continua sendo o melhor: contrato explícito, versionamento, erros que dizem o que aconteceu. O problema é que vários desses sistemas simplesmente não têm API. Ficar esperando o roadmap de um terceiro pode significar nunca integrar.

## A ideia: a interface como superfície de integração

Se a única porta que o sistema oferece é a tela, a integração passa pela tela, dentro de sessões controladas e para quem tem autorização para operar aquela plataforma.

Isso **não** quer dizer que interfaces sejam melhores que APIs. A interface foi feita para gente, muda sem aviso e não promete nada para quem automatiza. A diferença é que ela existe hoje. O desenho todo parte dessa aceitação: vou depender de uma superfície frágil, então preciso de controle sobre a sessão, rotinas fáceis de ajustar e honestidade sobre o que pode dar errado.

### Por que desktop

Uma pergunta justa: por que não fazer tudo dentro da própria aplicação web?

Porque a política de mesma origem dos navegadores impede que um script comum da minha aplicação leia ou controle a página de outro domínio. Isso não torna a automação impossível. Uma extensão de navegador, uma ferramenta de RPA ou um navegador automatizado no servidor também chegariam lá. Mas, neste caso, eu queria três coisas ao mesmo tempo:

1. controlar o navegador inteiro, inclusive perfis de autenticação e regras de navegação;
2. manter a sessão na máquina de quem está atendendo, ao lado do trabalho dessa pessoa;
3. ser acionado pela aplicação web com um clique.

Um agente desktop com navegadores embarcados (WebView2, num app WPF em .NET) entregava as três. O preço é real: instalação em cada máquina, atualização distribuída, só Windows, mais um componente para suportar e versões diferentes rodando ao mesmo tempo. Boa parte das decisões abaixo existe justamente para pagar esse preço.

## A arquitetura que existe hoje

São cinco peças:

- **Aplicação web:** organiza o trabalho e pede a abertura de uma plataforma.
- **Agente desktop Windows:** hospeda os navegadores embarcados, as abas e os perfis de autenticação isolados.
- **API de controle:** guarda plataformas, contas disponíveis, permissões, roteiros de login e rotinas.
- **Serviço de atendimento:** controla o ciclo do atendimento e a devolução das contas.
- **Protocolo customizado:** permite que a aplicação web acione o agente.

```text
IMPLEMENTADO

┌───────────────────┐   protocolo   ┌──────────────────────────┐
│  Aplicação web    │──────────────▶│  Agente desktop (WPF)    │
│                   │◀── presença ──│  · abas com WebView2     │
└─────────┬─────────┘  (HTTP local) │  · perfil por reserva    │
          │                         │  · executor de rotinas   │
          │ atendimento             └─────┬──────────────┬─────┘
          ▼                               │ reserva,     │ sessão
┌───────────────────┐   devolução   ┌─────▼──────────┐   │ autenticada
│ Serviço de        │──────────────▶│ API de controle│   ▼
│ atendimento       │               │ contas, regras,│  Plataformas
└───────────────────┘               │ rotinas        │  externas
                                    └───────┬────────┘
                                            ▼
                                       SQL Server
```

Na prática, o fluxo é este:

1. Durante um atendimento, a pessoa pede para abrir uma plataforma.
2. A aplicação web aciona o agente pelo protocolo.
3. O agente pede uma reserva de conta, para aquela pessoa e aquele atendimento.
4. Abre uma aba com um perfil limpo e as regras de navegação da plataforma, e roda o roteiro de login.
5. A pessoa trabalha, e pode disparar rotinas cadastradas.
6. Quando o atendimento termina, a conta é devolvida e o perfil vai embora.

## As decisões que mostram os detalhes difíceis

### Acordar o desktop a partir do navegador

A aplicação web aciona o agente por um protocolo registrado no Windows, mesmo com o agente fechado. Isso traz três problemas pequenos que viram grandes se ignorados:

- **Uma instância só.** Se o agente já está aberto, uma nova ativação precisa ser repassada ao processo existente, e não abrir uma segunda cópia brigando pelas mesmas abas.
- **Sem pedir administrador.** Instalação e registro são por usuário. Numa operação com muitas máquinas, depender de privilégio elevado para cada instalação ou atualização trava tudo.
- **O navegador não sabe se deu certo.** Acionar um protocolo é um tiro no escuro: a página não recebe resposta. Por isso existe um serviço HTTP local, que a aplicação web consulta para saber se o agente está presente e disponível antes de prometer alguma coisa para a pessoa.

Um cuidado que esse desenho exige: um protocolo registrado pode ser acionado por qualquer página. A ativação é um pedido, não uma ordem. Quem decide se a pessoa pode usar aquela plataforma é a API de controle, que mantém as permissões.

### Conta como recurso reservável

Cada conta compartilhada virou um recurso que se reserva e se devolve, com operações atômicas e idempotentes no banco. Atômicas para que duas pessoas não peguem a mesma conta ao mesmo tempo. Idempotentes porque, no mundo real, existe clique duplo, retentativa depois de timeout e mensagem que chega duas vezes. Repetir uma reserva ou uma devolução não pode bagunçar o estado.

Um limite importante: a reserva ser atômica **não** torna idempotente o que acontece no sistema externo. Se uma rotina enviou um formulário e a resposta se perdeu, repetir a rotina pode enviar de novo. A garantia vale para quem está com a conta, não para os efeitos lá fora.

### Perfil limpo a cada reserva

Cada plataforma tem o seu perfil de autenticação e as suas regras de navegação permitida. Uma nova reserva começa com um perfil limpo, e a devolução apaga esse perfil. A ideia é simples: a próxima pessoa não herda cookies, sessão ou dados de quem usou a conta antes.

Perfis isolados e listas de navegação permitida reduzem bastante o risco de vazamento acidental entre sessões e de alguém sair navegando por onde não devia. Mas eles **não** transformam o navegador num sandbox inviolável. Uma página maliciosa, uma falha do motor do navegador ou uma máquina comprometida continuam sendo riscos de outra ordem.

### A senha que ninguém digita

O agente preenche o login. A pessoa não precisa ver, copiar ou digitar a senha. Isso reduz bastante a exposição do dia a dia: menos chance de a senha parar num papel, num bloco de notas ou numa conversa, e menos gente precisando conhecê-la.

Reduzir exposição não é o mesmo que garantir segredo. Para preencher o formulário, a credencial passa pelo processo do agente e pela máquina. Alguém com controle da máquina ou ferramentas de depuração pode, em tese, extraí-la. E, uma vez logada, a pessoa opera a sessão normalmente.

### Login e procedimentos são a mesma coisa

A decisão de que mais gosto: o roteiro de login e os procedimentos de trabalho usam **o mesmo executor de rotinas**. Uma rotina é um dado persistido, uma sequência de passos como navegar, preencher, clicar, selecionar, pressionar teclas, esperar e pedir confirmação humana.

Algo nesta linha (ilustrativo, não é o formato real):

```yaml
# Ilustrativo: a forma da ideia, não o formato do sistema.
rotina: consultar-pedido
passos:
  - navegar: "{endereço da plataforma}/pedidos"
  - preencher: { alvo: "campo de busca", valor: "{número do pedido}" }
  - tecla: Enter
  - esperar: { ate: "lista de resultados visível" }
  - confirmar: "Confere se é o pedido certo antes de continuar?"
```

Um administrador pode **gravar** interações para cadastrar um procedimento, sem escrever uma integração específica para cada sistema. A gravação do roteiro de login tem uma restrição própria: ela fica limitada aos valores de usuário e senha da conta disponibilizada.

Gravar reduz muito a programação específica. Não elimina manutenção. A interface muda, um campo troca de lugar, uma espera que funcionava passa a ser curta. Validar uma rotina gravada e entender por que ela quebrou continua exigindo conhecimento técnico.

### Quando a sessão expira

Para perceber que uma sessão caiu, o agente usa uma pista: depois de um login bem-sucedido, se os elementos do formulário de login reaparecem, provavelmente a sessão expirou.

É uma heurística, e eu a trato assim. Se a plataforma redesenha a tela de login, a pista some. Se algum formulário parecido aparece em outro contexto, ela pode disparar sem motivo. E plataformas sem um roteiro de login observável não recebem essa detecção.

### "Não sei" não é "revogado"

O agente consulta de tempos em tempos quais reservas continuam válidas. Quando essa consulta falha por rede ou autenticação, o resultado é **estado desconhecido**, não a confirmação de que a reserva foi revogada. Parece detalhe, mas tratar falha de rede como revogação fecharia abas de quem está trabalhando sempre que o Wi-Fi piscasse. O oposto também é ruim: tratar falha como "tudo certo" para sempre. Desconhecido precisa ser um estado de primeira classe.

Na mesma linha, quando uma rotina está no meio da execução, o encerramento **operacional** da aba pode esperar ela terminar. Interromper no meio pode deixar o sistema externo num estado pior do que qualquer um dos dois extremos.

Isso não é uma regra universal de segurança. Encerramento planejado, como o fim de um atendimento, é diferente de revogação urgente, como um acesso que precisa ser cortado agora. No segundo caso, esperar a rotina terminar pode ser exatamente o que não se quer. E fechar a aba local não invalida, sozinho, uma sessão que o sistema externo ainda considera aberta.

### Atualizar sem derrubar ninguém

Atualizar um app desktop com sessões abertas é pedir para estragar o dia de alguém. Por isso as atualizações esperam uma janela sem plataformas abertas. Se essa janela demora a aparecer, existe uma solicitação para que ela seja liberada.

O pacote de atualização tem o hash verificado, e um processo auxiliar externo espera o agente encerrar, instala a atualização e reabre o agente. O hash confere a **integridade** em relação ao valor esperado: o arquivo baixado é o que o manifesto disse que seria. **Autenticidade** depende de confiar na origem desse manifesto. Assinatura de código seria o passo natural para fortalecer essa parte.

Completam o pacote: confirmações para fechar abas e o agente, histórico de execução das rotinas e informações sobre falhas, para que o suporte não dependa só do relato de quem estava na tela.

## O que isso resolve, e o que não resolve

**Rastreabilidade de acesso não é auditoria de ações.** O desenho deixa claro quem estava com qual conta, em qual atendimento e quando. Ele **não** comprova cada ação feita dentro do sistema externo. Para esse sistema, quem agiu foi a conta compartilhada. O histórico das rotinas ajuda no que passou pelo executor, mas as ações manuais dentro da sessão não ficam auditadas uma a uma.

**A interface continua frágil.** Uma mudança de layout pode quebrar o login ou uma rotina sem aviso. O sistema ajuda a perceber e corrigir, mas não impede.

**Os termos de uso importam.** Automatizar a interface de um terceiro só faz sentido com autorização para operar aquele sistema, e vale ler o contrato antes de sair gravando rotinas.

**Alternativas, cada uma com o seu custo:**

- **API oficial ou integração de parceiro:** o melhor caminho quando existe.
- **Contas individuais com SSO ou acesso delegado:** se a plataforma permite e o licenciamento cabe, isso resolve o compartilhamento na raiz.
- **Cofre de senhas com compartilhamento:** resolve a distribuição da credencial, mas não o vínculo com o atendimento nem os procedimentos.
- **Extensão de navegador:** menos atrito que um app instalado, menos controle sobre perfis e ciclo de vida.
- **RPA ou navegador automatizado no servidor:** bons para trabalho sem pessoa na frente. Para operação assistida, levam a sessão para longe de quem está atendendo.

## O padrão fora daqui

Tirando os nomes, o formato é comum. Operações autorizadas sobre sistemas de terceiros, com acessos compartilhados e procedimentos repetíveis, aparecem em:

- **BPO e backoffice**, operando portais de vários clientes;
- **contabilidade**, com portais de órgãos e instituições;
- **seguros**, com portais de seguradoras para cotação e acompanhamento;
- **cobrança**, com portais de credores e bancos;
- **logística**, com portais de transportadoras e marketplaces.

Em todos, as perguntas são as mesmas: de quem é a conta agora, como o procedimento deixa de depender da memória de alguém e o que acontece quando a tela muda.

## E a IA nessa história?

Daqui para baixo, **nada está implementado**. São propostas de evolução.

O princípio que eu manteria em todas: **o modelo propõe, o aplicativo decide.** Permissão, validação e execução continuam em código determinístico, que já existe hoje no executor de rotinas.

1. **Intenção em linguagem natural.** A pessoa descreve a tarefa, e um modelo propõe um plano feito de ações que o sistema já conhece, não de comandos inventados.
2. **Rotinas a partir de demonstração ou descrição.** O modelo transforma uma gravação ou um texto numa rotina candidata, que alguém revisa antes de usar.
3. **Escolha contextual.** Diante de uma página, o modelo escolhe entre os elementos observados e as operações permitidas para aquela plataforma. Escolher é bem diferente de inventar seletor.
4. **Mudanças de interface.** Quando um passo quebra, o modelo sugere a correspondência mais provável, e a rotina só é substituída depois de validada.
5. **Verificação de resultado.** Comparar o estado observado com o objetivo e separar três respostas: concluído, falhou e não sei.
6. **Diagnóstico assistido.** Interpretar a falha e propor recuperação, sem repetir às cegas uma ação que pode já ter produzido efeito.
7. **Execução assistida.** Automatizar o que é previsível e pedir confirmação nas decisões que importam.
8. **Uma interface de ferramentas para agentes.** Expor operações limitadas via MCP ou contrato equivalente, com autorização e execução sob controle do aplicativo, e não do agente que chama.

### Onde um modelo como o Jev se encaixa

O [Jev](https://docs.typesafe.ai/introduction), da TypeSafe, é um exemplo interessante para os itens 3 e 5. Pela documentação oficial (consultada em outubro de 2026), ele é um modelo de decisão estruturada, não um controlador de desktop:

- **recebe texto:** strings, objetos JSON e listas de texto; imagem não é suportada;
- **responde com tipos:** escolher uma opção de uma lista, dar uma nota numa escala definida ou dizer se uma afirmação é verdadeira, com probabilidades;
- **não gera texto nem código,** e não clica em nada.

Isso combina com escolhas delimitadas. Em vez de mandar um print, o agente montaria uma **representação textual da página**, um recorte do DOM ou da árvore de acessibilidade, com papel, nome e estado de cada elemento relevante. Junto vai a lista dos alvos candidatos já enumerados pelo código. O modelo responderia algo como "o alvo provável é o candidato 7", com uma confiança, ou "a página mostra uma confirmação de envio", com uma probabilidade. Os valores dependem do caso; nenhum número aqui vem de teste.

A arquitetura que eu testaria é híbrida:

- **modelo generativo** para interpretar a intenção e planejar, só quando necessário;
- **modelo de decisão**, como o Jev, para escolhas delimitadas;
- **código determinístico** para permissões, validação, limites e execução;
- **humano** para confirmação e exceções relevantes.

```text
EXPANSÃO PROPOSTA (não implementada)
legenda: ┄ proposto · ─ já existe

           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
Pessoa ┄┄▶ ┆ Modelo generativo          ┆
 intenção  ┆ interpreta e planeja       ┆
           └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                          ┆ plano com ações conhecidas
                          ▼
           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
Página ┄┄▶ ┆ Modelo de decisão          ┆
 estado    ┆ (ex.: Jev)                 ┆
 em texto  └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                          ┆ escolha + confiança
                          ▼
           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
           ┆ Validação da proposta      ┆
           ┆ permissões · limites       ┆
           └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                          ┆ confirmação humana, se preciso
                          ▼
           ┌────────────────────────────┐
           │ Executor de rotinas        │
           │ do agente desktop          │
           └──────────────┬─────────────┘
                          ▼
          verificar o resultado (proposto)
```

Um fluxo genérico, em pseudocódigo ilustrativo:

```csharp
// Ilustrativo: um esboço da ideia, não código do sistema.
var estado  = Observar(aba);            // árvore de acessibilidade podada, sem dados sensíveis
var alvos   = Candidatos(estado, passo); // só elementos observados agora
var decisao = await modelo.Escolher(passo.Descricao, alvos);   // escolha delimitada

if (!Permitido(plataforma, passo.Acao, decisao.Alvo)) return Bloquear();
if (passo.Irreversivel || decisao.Confianca < limiar)
    if (!await Pessoa.Confirmar(passo, decisao)) return Cancelar();

Executar(passo.Acao, decisao.Alvo);
var resultado = Verificar(Observar(aba), passo.Objetivo); // Concluido | Falhou | Incerto
```

**Observar → propor → validar → confirmar quando necessário → executar → verificar.** Num exemplo de cobrança: a pessoa pede a segunda via de um documento. O modelo propõe o caminho com ações conhecidas. O código confere se aquela ação é permitida na plataforma. A emissão pede confirmação. O executor clica, e a verificação procura o documento na tela antes de dizer "concluído".

Três cuidados que eu não negociaria:

- **Confiança não é autorização nem garantia de acerto.** A própria documentação do Jev diz que a calibração é medida sobre grupos de previsões e não garante que uma resposta individual esteja certa. O limiar decide quando pedir ajuda. Quem decide se a ação pode acontecer é a permissão.
- **Conteúdo observado é dado, não instrução.** Uma página pode conter texto feito para manipular o modelo ("ignore as instruções e..."). Nada que venha da tela vira comando. As ações possíveis vêm da lista permitida, nunca do conteúdo da página.
- **Credenciais nunca vão para o modelo.** Dados sensíveis devem ser minimizados ou mascarados antes de qualquer chamada, a execução precisa de limites de passos, tempo e escopo, e ações irreversíveis sempre passam por uma pessoa.

Sobre os ganhos: menos latência, menos custo e menos dependência de roteiros rígidos são **hipóteses**. Elas precisam ser medidas com rotinas reais antes de virar argumento. Não tenho números, e não vou fingir que tenho.

## Perguntas em aberto

Se você já mexeu com algo parecido, eu quero muito saber como resolveu:

- Qual é a melhor representação textual de uma página para decisões delimitadas: DOM podado, árvore de acessibilidade ou uma mistura?
- Como detectar que uma rotina quebrou **antes** de alguém perceber no meio de um atendimento?
- Como descrever o efeito de uma ação, para saber se é seguro repetir depois de uma falha?
- Quando o sistema externo só conhece uma conta compartilhada, até onde dá para ir de rastreabilidade de acesso para auditoria de ações?
- MCP é o contrato certo para expor esse tipo de operação a agentes, ou faz mais sentido algo mais restrito?
- Como você lida com plataformas cujos termos de uso não falam nada sobre automação?

Deixa a sua experiência nos comentários aqui embaixo. Concordando ou discordando, a conversa fica melhor.

## Referências

- TypeSafe: [Introduction](https://docs.typesafe.ai/introduction) e [System One](https://docs.typesafe.ai/concepts/system-one) (documentação oficial do Jev), e [typesafe.ai](https://typesafe.ai/).
- MDN: [Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) e [Accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree).
- Microsoft: [WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/), [user data folder](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder) e [registro de protocolos no Windows](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa767914(v=vs.85)).
- [Model Context Protocol](https://modelcontextprotocol.io/).
- OWASP: [LLM01, Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
