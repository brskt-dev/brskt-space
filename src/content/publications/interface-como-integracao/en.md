---
type: article
title: "When the UI becomes the integration: from recorded routines to AI agents"
summary: "How to give people access to legacy web systems with no API, or with accounts too expensive to have one per person: a desktop agent that lends accounts, opens isolated sessions and runs routines. And how I’d take the idea toward AI agents."
date: 2026-10-05
tags: ["Architecture", ".NET", "WebView2", "SQL Server", "Automation", "AI agents"]
---

Every company has that legacy web system nobody can quite let go of. Sometimes it has no API. Sometimes it does, but each account costs so much that giving one to every person on the team is out of the question. You know how it ends: a few shared accounts, a password passed from hand to hand, no one really sure who's using what, and each screen's step-by-step living in the head of whoever has done it a hundred times.

Lending accounts sounds simple until someone actually has to keep track of it. I built a solution for this scenario: a desktop agent that lends out the accounts, opens the system in an isolated session, signs in on its own and runs stored procedures. In this post I explain how it works and where I'd take the idea with AI.

## The idea: use the screen as the integration

When a proper API exists, it's still the best route. The problem is that it doesn't always exist, and waiting for a third party's roadmap can mean never integrating at all.

So the integration goes through the only door available: the UI. Always inside controlled sessions and for people who are authorized to use that system.

Why desktop? The browser's same-origin policy keeps a regular script in my web app from controlling a page on another domain. There were other routes, like an extension or an automated browser on a server. But I wanted control over the whole browser, with authentication profiles and navigation rules, and to keep the session on the machine of the person using it. A WPF app on .NET with embedded browsers (WebView2) delivered that, at the cost of installing and updating a program on every machine.

## How it works

There are five pieces:

- **Web application:** where the work happens; it's where the request to open a system comes from.
- **Windows desktop agent:** hosts the embedded browsers, tabs and isolated profiles.
- **Control API:** stores systems, available accounts, permissions, login scripts and routines.
- **Usage lifecycle service:** decides when a session of use ends and the account has to come back.
- **Custom protocol:** lets the web app trigger the agent.

```text
IMPLEMENTED

┌───────────────────┐   protocol    ┌──────────────────────────┐
│  Web application  │──────────────▶│  Desktop agent (WPF)     │
│                   │◀── presence ──│  · WebView2 tabs         │
└─────────┬─────────┘  (local HTTP) │  · clean profile per use │
          │                         │  · routine executor      │
          │ start of use            └─────┬──────────────┬─────┘
          ▼                               │ reserve      │ authenticated
┌───────────────────┐   returns     ┌─────▼──────────┐   │ session
│ Usage lifecycle   │──────────────▶│ Control API    │   ▼
│ service           │               │ accounts,      │  External
└───────────────────┘               │ rules, routines│  systems
                                    └───────┬────────┘
                                            ▼
                                       SQL Server
```

The person asks to open a system, the web app triggers the agent, the agent reserves a free account, opens a tab with a clean profile and signs in. When the use ends, the account goes back to the pool and the profile is deleted.

## The decisions I like most

**Waking the desktop from the browser.** The agent is triggered by a protocol registered in Windows, even when it's closed. If it's already open, the new activation goes to the running instance. Install is per user, no admin rights needed. And since the page never learns whether the protocol worked, a local HTTP service answers whether the agent is present and available.

**Accounts as something you lend.** On the external system, the accounts are generic: something like account1, account2, account3, rather than one named after each person. The link between a person and an account lives in the prototype, which reserves and returns accounts with atomic, idempotent operations in the database. That gives you traceability of who used what and lets the accounts be shared dynamically. Every reservation starts with a clean profile, and returning the account deletes it, so nobody inherits someone else's session.

**The password nobody types.** The agent fills in the login. The person doesn't need to see, copy or type the password, and fewer people need to know it. It's not absolute secrecy, since the credential passes through the machine, but everyday exposure drops a lot.

**Login and procedures are the same thing.** The login script and the work procedures run on the same executor. A routine is persisted data: navigate, fill in, click, select, press keys, wait and ask for human confirmation. An administrator records the interactions to register a procedure, without writing an integration for each system. The UI will change and someone will have to adjust the routine, but adjusting data is a lot lighter than rewriting code.

## Where the idea goes next: AI agents

From here on, **nothing is implemented**. This is where I'd take the concept.

The executor already knows how to do things on the screen. The interesting question is who decides **what** to do. The principle I'd keep: **the model proposes, the application decides.** Permissions, validation and execution stay in deterministic code.

With that in place, you can picture:

- **Intent in natural language.** The person would say what they need, and a model would build a plan using only actions the system already knows.
- **Routines from a demonstration.** A recording or a description would become a candidate routine, reviewed before it goes into use.
- **Choosing instead of inventing.** Faced with the page, the model would choose among the observed elements and the allowed operations, instead of making up selectors.
- **Repairs when the screen changes.** When a step broke, the model would suggest the most likely match, validated before it replaces the routine.
- **Outcome verification.** Compare the screen with the goal and separate three answers: done, failed and don't know.
- **Tools for agents.** Expose limited operations through MCP or an equivalent contract, with authorization always on the application's side.

### Where a model like Jev fits

TypeSafe's [Jev](https://docs.typesafe.ai/introduction) is a good example for the bounded choices. According to its official docs, it's a "System One" model: it takes only text (strings, JSON, lists) and returns typed answers. Choice picks an option from a list, with probabilities and confidence. Score rates against a rubric. Noul says whether a statement is true, as a value from 0 to 1. It doesn't generate text, doesn't read images and doesn't click anything.

That fits here nicely. Instead of a screenshot, the agent would build a **text version of the page**, a slice of the DOM or the accessibility tree, plus the list of candidate targets. Jev would choose among them. To verify the outcome, the code would ask something like "does the page show a submission confirmation?" and get a value back.

The architecture I'd test is hybrid:

- a **generative model** to understand intent and plan, only when needed;
- a **decision model**, like Jev, for bounded choices;
- **deterministic code** for permissions, validation and execution;
- a **human** to confirm what matters.

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

The loop becomes: **observe → propose → validate → confirm when needed → execute → verify.**

Three rules I wouldn't give up: the model's confidence is not authorization; what shows up on the screen is data, never an instruction; and credentials never go to the model. Whether this cuts cost, latency or the dependence on rigid scripts is still a hypothesis. It needs to be measured on real routines.

## So, what would you do?

I have my opinions, but I want to hear yours:

- What page representation would you give a decision model: a pruned DOM, the accessibility tree, or a mix?
- Would you trust an agent with a whole routine, or only the predictable steps?
- Is MCP the right contract for exposing this kind of operation, or does something more restricted make more sense?
- Where else do you see this pattern of lent accounts and screens with no API?

Drop it in the comments below.

## References

- TypeSafe: [Introduction](https://docs.typesafe.ai/introduction) and [System One](https://docs.typesafe.ai/concepts/system-one) (Jev's official docs, checked in October 2026), and [typesafe.ai](https://typesafe.ai/).
- MDN: [Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) and [Accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree).
- Microsoft: [WebView2](https://learn.microsoft.com/en-us/microsoft-edge/webview2/).
- [Model Context Protocol](https://modelcontextprotocol.io/).
- OWASP: [LLM01, Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
