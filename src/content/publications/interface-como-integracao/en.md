---
type: article
title: "When the UI becomes the integration: from recorded routines to AI agents"
summary: "A desktop agent that books shared accounts, opens isolated sessions and runs routines on third-party systems with no API. The hard decisions behind it, the limits that remain, and how I'd take the idea toward AI agents without handing the wheel to the model."
date: 2026-10-05
tags: ["Architecture", ".NET", "WebView2", "SQL Server", "Automation", "AI agents"]
---

Picture someone handling a support case who, to solve a single request, has to sign in to three or four third-party systems. Each one has its own account, its own login screen and its own way of doing things. Some are web apps with no API at all. The accounts are shared and limited, so someone has to know which one is free, what the password is and how to do that procedure only people who sat through the training remember.

I developed a design for this scenario: a desktop agent that opens those platforms inside controlled sessions, signs in on its own and runs routines stored as data. This post covers the idea, the decisions that took the most work, what it does **not** solve, and where I'd take the concept with AI.

To keep things honest, the post has three layers: **what was implemented**, **an analysis of its limits** and **expansions I'm proposing that don't exist in the system**.

## The problem wasn't just the login

At first glance it looks like a password problem. It isn't. There were four symptoms:

- **Shared, limited accounts.** Many people, few accounts, no clear picture of who is using what.
- **Repeated manual logins.** Typing a username and password on every access, with the password travelling through more places than it should.
- **Hard attribution.** When a shared account is used, it's hard to say who used it and for which case.
- **Procedures living in people's heads.** Each system's step-by-step lived in training sessions, notes and old messages.

The obvious path would be integrating through an API. And when a proper API exists, that's still the best route: an explicit contract, versioning, errors that tell you what happened. The catch is that several of these systems simply don't have one. Waiting for a third party's roadmap can mean never integrating at all.

## The idea: the UI as an integration surface

If the only door a system offers is its screen, the integration goes through the screen, inside controlled sessions and for people who are authorized to operate that platform.

That does **not** mean UIs are better than APIs. A UI is built for people, changes without notice and promises nothing to whoever automates it. The difference is that it exists today. The whole design starts from that acceptance: I'm going to depend on a fragile surface, so I need control over the session, routines that are easy to adjust and honesty about what can go wrong.

### Why desktop

A fair question: why not do it all inside the web app?

Because the browser's same-origin policy keeps a regular script in my app from reading or controlling a page from another domain. That doesn't make automation impossible. A browser extension, an RPA tool or an automated browser on a server would also get there. But here I wanted three things at once:

1. control over the whole browser, including authentication profiles and navigation rules;
2. the session staying on the machine of the person handling the case, next to their work;
3. being triggered from the web app with a single click.

A desktop agent with embedded browsers (WebView2, in a WPF app on .NET) delivered all three. The price is real: an install on every machine, distributed updates, Windows only, one more component to support and different versions running at the same time. Many of the decisions below exist precisely to pay that price.

## The architecture that exists today

There are five pieces:

- **Web application:** organizes the work and asks for a platform to be opened.
- **Windows desktop agent:** hosts the embedded browsers, tabs and isolated authentication profiles.
- **Control API:** stores platforms, available accounts, permissions, login scripts and routines.
- **Support service:** controls the lifecycle of a case and the return of accounts.
- **Custom protocol:** lets the web app trigger the agent.

```text
IMPLEMENTED

┌───────────────────┐   protocol    ┌──────────────────────────┐
│  Web application  │──────────────▶│  Desktop agent (WPF)     │
│                   │◀── presence ──│  · WebView2 tabs         │
└─────────┬─────────┘  (local HTTP) │  · profile per booking   │
          │                         │  · routine executor      │
          │ case                    └─────┬──────────────┬─────┘
          ▼                               │ book/return  │ authenticated
┌───────────────────┐   returns     ┌─────▼──────────┐   │ session
│ Support service   │──────────────▶│ Control API    │   ▼
│                   │               │ accounts,      │  External
└───────────────────┘               │ rules, routines│  platforms
                                    └───────┬────────┘
                                            ▼
                                       SQL Server
```

In practice, the flow goes like this:

1. During a case, the person asks to open a platform.
2. The web app triggers the agent through the protocol.
3. The agent asks for an account booking, for that person and that case.
4. It opens a tab with a clean profile and the platform's navigation rules, and runs the login script.
5. The person works, and can trigger stored routines.
6. When the case ends, the account is returned and the profile goes away.

## The decisions that expose the hard parts

### Waking the desktop from the browser

The web app triggers the agent through a protocol registered in Windows, even when the agent is closed. That brings three small problems that turn into big ones if you ignore them:

- **One instance only.** If the agent is already open, a new activation has to be handed to the running process instead of starting a second copy that fights over the same tabs.
- **No admin rights.** Install and registration are per user. In an operation with many machines, needing elevated privileges for every install or update stalls everything.
- **The browser doesn't know if it worked.** Triggering a protocol is a shot in the dark: the page gets no answer back. That's why there's a local HTTP service the web app checks to know whether the agent is present and available before promising anything to the person.

One thing this design demands: a registered protocol can be triggered by any page. An activation is a request, not an order. Whether the person may use that platform is decided by the control API, which holds the permissions.

### Accounts as bookable resources

Each shared account became a resource you book and return, through atomic, idempotent operations in the database. Atomic so two people can't take the same account at the same time. Idempotent because, in the real world, there are double clicks, retries after timeouts and messages that arrive twice. Repeating a booking or a return must not corrupt the state.

An important limit: the booking being atomic does **not** make what happens in the external system idempotent. If a routine submitted a form and the response got lost, running the routine again may submit it again. The guarantee covers who holds the account, not the effects out there.

### A clean profile on every booking

Each platform has its own authentication profile and its own allowed-navigation rules. A new booking starts with a clean profile, and returning the account deletes it. The idea is simple: the next person doesn't inherit cookies, sessions or data from whoever used the account before.

Isolated profiles and navigation allowlists go a long way toward reducing accidental leaks between sessions and keeping people from wandering where they shouldn't. But they do **not** turn the browser into an unbreakable sandbox. A malicious page, a flaw in the browser engine or a compromised machine are risks of a different order.

### The password nobody types

The agent fills in the login. The person doesn't need to see, copy or type the password. That cuts a lot of everyday exposure: less chance of the password ending up on a sticky note, in a text file or in a chat, and fewer people who need to know it.

Reducing exposure is not the same as guaranteeing secrecy. To fill in the form, the credential passes through the agent's process and the machine. Someone with control of the machine or debugging tools could, in principle, extract it. And once signed in, the person operates the session normally.

### Login and procedures are the same thing

My favorite decision: the login script and the work procedures run on **the same routine executor**. A routine is persisted data, a sequence of steps such as navigate, fill in, click, select, press keys, wait and ask for human confirmation.

Something along these lines (illustrative, not the real format):

```yaml
# Illustrative: the shape of the idea, not the system's format.
routine: look-up-order
steps:
  - navigate: "{platform address}/orders"
  - fill: { target: "search field", value: "{order number}" }
  - key: Enter
  - wait: { until: "results list visible" }
  - confirm: "Is this the right order before we continue?"
```

An administrator can **record** interactions to register a procedure, without writing a specific integration for each system. Recording the login script has its own restriction: it's limited to the username and password values of the account being made available.

Recording cuts a lot of system-specific programming. It doesn't remove maintenance. The UI changes, a field moves, a wait that used to work becomes too short. Validating a recorded routine and understanding why it broke still takes technical knowledge.

### When the session expires

To notice that a session dropped, the agent uses a clue: after a successful login, if the login form elements show up again, the session has probably expired.

It's a heuristic, and I treat it as one. If the platform redesigns its login screen, the clue disappears. If a similar form appears in another context, it can fire for no reason. And platforms without an observable login script don't get this detection.

### "I don't know" is not "revoked"

The agent periodically checks which bookings are still valid. When that check fails because of the network or authentication, the result is an **unknown state**, not confirmation that the booking was revoked. It sounds like a detail, but treating a network failure as revocation would close the tabs of people who are working every time the Wi-Fi blinked. The opposite is also bad: treating failure as "all good" forever. Unknown needs to be a first-class state.

Along the same lines, when a routine is mid-run, the **operational** closing of the tab can wait for it to finish. Cutting it off halfway can leave the external system in a worse state than either end.

That's not a universal security rule. A planned closure, like the end of a case, is different from an urgent revocation, like access that has to be cut right now. In the second case, waiting for the routine to finish may be exactly what you don't want. And closing the local tab doesn't, on its own, invalidate a session the external system still considers open.

### Updating without kicking anyone out

Updating a desktop app with open sessions is a great way to ruin someone's day. So updates wait for a window with no platforms open. If that window takes too long to come, there's a request asking for it to be freed up.

The update package has its hash checked, and an external helper process waits for the agent to close, installs the update and reopens the agent. The hash checks **integrity** against the expected value: the downloaded file is what the manifest said it would be. **Authenticity** depends on trusting where that manifest comes from. Code signing would be the natural next step to strengthen that part.

Rounding it out: confirmations before closing tabs and the agent, a run history for routines and failure details, so support doesn't depend only on what the person at the screen remembers.

## What this solves, and what it doesn't

**Access traceability is not action auditing.** The design makes it clear who had which account, for which case and when. It does **not** prove each action taken inside the external system. As far as that system knows, the shared account did it. The routine history helps with whatever went through the executor, but manual actions inside the session aren't audited one by one.

**The UI is still fragile.** A layout change can break the login or a routine without warning. The system helps you notice and fix it, but it doesn't prevent it.

**Terms of use matter.** Automating a third party's UI only makes sense when you're authorized to operate that system, and it's worth reading the contract before you start recording routines.

**Alternatives, each with its own cost:**

- **An official API or partner integration:** the best route when it exists.
- **Individual accounts with SSO or delegated access:** if the platform supports it and licensing allows, this solves sharing at the root.
- **A password vault with sharing:** solves distributing the credential, but not the link to the case or the procedures.
- **A browser extension:** less friction than an installed app, less control over profiles and lifecycle.
- **RPA or an automated browser on a server:** good for work with nobody at the screen. For assisted operations, they move the session away from the person handling the case.

## The pattern beyond this case

Strip the names away and the shape is common. Authorized operations on third-party systems, with shared access and repeatable procedures, show up in:

- **BPO and back office**, operating portals for many clients;
- **accounting**, with portals from agencies and institutions;
- **insurance**, with insurer portals for quotes and follow-ups;
- **collections**, with creditor and bank portals;
- **logistics**, with carrier and marketplace portals.

In all of them the questions are the same: whose account is it right now, how does a procedure stop depending on someone's memory, and what happens when the screen changes.

## And where does AI come in?

From here on, **nothing is implemented**. These are proposals.

The principle I'd keep throughout: **the model proposes, the application decides.** Permissions, validation and execution stay in deterministic code, which already exists today in the routine executor.

1. **Intent in natural language.** The person describes the task, and a model proposes a plan made of actions the system already knows, not invented commands.
2. **Routines from a demonstration or description.** The model turns a recording or a text into a candidate routine, which someone reviews before it's used.
3. **Contextual choice.** Faced with a page, the model chooses among the observed elements and the operations allowed for that platform. Choosing is very different from inventing a selector.
4. **UI changes.** When a step breaks, the model suggests the most likely match, and the routine is only replaced after it's validated.
5. **Outcome verification.** Compare the observed state with the goal and separate three answers: done, failed and don't know.
6. **Assisted diagnosis.** Interpret the failure and propose a recovery, without blindly repeating an action that may already have had an effect.
7. **Assisted execution.** Automate what's predictable and ask for confirmation on the decisions that matter.
8. **A tool interface for agents.** Expose limited operations through MCP or an equivalent contract, with authorization and execution under the application's control, not the calling agent's.

### Where a model like Jev fits

TypeSafe's [Jev](https://docs.typesafe.ai/introduction) is an interesting example for items 3 and 5. According to its official docs (checked in October 2026), it's a model for structured decisions, not a desktop controller:

- **it takes text:** strings, JSON objects and lists of text; images aren't supported;
- **it answers with types:** pick an option from a list, score on a defined scale, or say whether a statement is true, with probabilities;
- **it doesn't generate text or code,** and it doesn't click anything.

That fits bounded choices. Instead of sending a screenshot, the agent would build a **text representation of the page**, a slice of the DOM or the accessibility tree, with the role, name and state of each relevant element. Along with it goes the list of candidate targets the code has already enumerated. The model would answer something like "the likely target is candidate 7", with a confidence, or "the page shows a submission confirmation", with a probability. The values depend on the case; no number here comes from a test.

The architecture I'd test is hybrid:

- a **generative model** to interpret intent and plan, only when needed;
- a **decision model**, like Jev, for bounded choices;
- **deterministic code** for permissions, validation, limits and execution;
- a **human** for confirmation and relevant exceptions.

```text
PROPOSED EXPANSION (not implemented)
legend: ┄ proposed · ─ already exists

           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
Person ┄┄▶ ┆ Generative model           ┆
 intent    ┆ interprets and plans       ┆
           └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                          ┆ plan made of known actions
                          ▼
           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
Page   ┄┄▶ ┆ Decision model             ┆
 state     ┆ (e.g. Jev)                 ┆
 as text   └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                          ┆ choice + confidence
                          ▼
           ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐
           ┆ Proposal validation        ┆
           ┆ permissions · limits       ┆
           └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┬┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                          ┆ human confirmation if needed
                          ▼
           ┌────────────────────────────┐
           │ Routine executor           │
           │ in the desktop agent       │
           └──────────────┬─────────────┘
                          ▼
            verify the outcome (proposed)
```

A generic flow, in illustrative pseudocode:

```csharp
// Illustrative: a sketch of the idea, not code from the system.
var state    = Observe(tab);                 // pruned accessibility tree, no sensitive data
var targets  = Candidates(state, step);      // only elements observed right now
var decision = await model.Choose(step.Description, targets);   // bounded choice

if (!Allowed(platform, step.Action, decision.Target)) return Block();
if (step.Irreversible || decision.Confidence < threshold)
    if (!await Person.Confirm(step, decision)) return Cancel();

Execute(step.Action, decision.Target);
var outcome = Verify(Observe(tab), step.Goal); // Done | Failed | Uncertain
```

**Observe → propose → validate → confirm when needed → execute → verify.** A collections example: the person asks for a copy of a document to be reissued. The model proposes the path using known actions. The code checks that the action is allowed on that platform. Issuing asks for confirmation. The executor clicks, and verification looks for the document on the screen before saying "done".

Three things I wouldn't compromise on:

- **Confidence is neither authorization nor a guarantee of being right.** Jev's own docs say calibration is measured across groups of predictions and doesn't guarantee that an individual answer is correct. The threshold decides when to ask for help. Whether the action may happen at all is decided by permissions.
- **Observed content is data, not instructions.** A page can contain text designed to manipulate the model ("ignore your instructions and..."). Nothing that comes from the screen becomes a command. The possible actions come from the allowed list, never from the page content.
- **Credentials never go to the model.** Sensitive data should be minimized or masked before any call, execution needs limits on steps, time and scope, and irreversible actions always go through a person.

As for the gains: lower latency, lower cost and less dependence on rigid scripts are **hypotheses**. They need to be measured on real routines before they become arguments. I don't have numbers, and I'm not going to pretend I do.

## Open questions

If you've worked on something similar, I'd really like to know how you handled it:

- What's the best text representation of a page for bounded decisions: a pruned DOM, the accessibility tree, or a mix?
- How do you detect that a routine broke **before** someone runs into it in the middle of a case?
- How do you describe the effect of an action, so you know whether it's safe to repeat after a failure?
- When the external system only knows a shared account, how far can you get from access traceability to action auditing?
- Is MCP the right contract for exposing this kind of operation to agents, or does something more restricted make more sense?
- How do you deal with platforms whose terms of use say nothing about automation?

Share your experience in the comments below. Agree or disagree, the conversation gets better either way.

## References

- TypeSafe: [Introduction](https://docs.typesafe.ai/introduction) and [System One](https://docs.typesafe.ai/concepts/system-one) (Jev's official docs), and [typesafe.ai](https://typesafe.ai/).
- MDN: [Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) and [Accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree).
- Microsoft: [WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/), [user data folder](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder) and [registering a protocol handler in Windows](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/aa767914(v=vs.85)).
- [Model Context Protocol](https://modelcontextprotocol.io/).
- OWASP: [LLM01, Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
