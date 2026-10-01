/**
 * Structured, factual, bilingual profile data (source: owner's CV — see SPEC §5).
 * Translatable strings are `{ pt, en }`. Do not add facts that are not in the CV.
 */
import type { Lang } from '../i18n/ui';

export type L10n = Record<Lang, string>;

export interface ExperienceEntry {
  role: L10n;
  company: string;
  /** "YYYY-MM" */
  start: string;
  /** "YYYY-MM" or null when current. */
  end: string | null;
  location: L10n;
  mode: L10n;
  highlights: L10n[];
  /** Plain string = same in both languages. */
  tech: Array<string | L10n>;
}

export interface SkillGroup {
  name: L10n;
  items: L10n;
}

export interface EducationEntry {
  degree: L10n;
  institution: string;
  completed: L10n;
  location: L10n;
  note: L10n;
}

export interface SpokenLanguage {
  name: L10n;
  level: L10n;
  /** BCP 47 code of the language itself. */
  code: string;
}

export const profile = {
  name: 'Bruno Anhezini',
  role: { pt: 'Desenvolvedor Full Stack', en: 'Full Stack Developer' } satisfies L10n,
  headline: {
    pt: 'Desenvolvedor Full Stack com foco em C#/.NET, Angular e SQL Server.',
    en: 'Full Stack Developer focused on C#/.NET, Angular and SQL Server.',
  } satisfies L10n,
  location: { pt: 'Americana, São Paulo, Brasil', en: 'Americana, São Paulo, Brazil' } satisfies L10n,
  lookingFor: {
    pt: 'Em busca de oportunidades 100% remotas, nacionais e internacionais, trabalhando a partir do Brasil.',
    en: 'Looking for 100% remote opportunities, in Brazil and abroad, working from Brazil.',
  } satisfies L10n,
  summary: {
    pt: 'Desenvolvedor Full Stack com experiência no desenvolvimento e sustentação de produtos SaaS em produção, atuando com C#/.NET, Angular, SQL Server e APIs REST. Possuo experiência prática com Docker, CI/CD, Kafka, Redis e ambientes distribuídos. Combino desenvolvimento de software, conhecimento de infraestrutura e visão de produto para construir sistemas estáveis, escaláveis e fáceis de evoluir.',
    en: 'Full Stack Developer with experience building and maintaining SaaS products in production, working with C#/.NET, Angular, SQL Server and REST APIs. Hands-on experience with Docker, CI/CD, Kafka, Redis and distributed environments. I combine software development, infrastructure knowledge and product thinking to build systems that are stable, scalable and easy to evolve.',
  } satisfies L10n,
  aiStatement: {
    pt: 'Uso Claude Code, Codex, MCP e agentes de IA de forma intensa, com revisão e validação técnica do que eles entregam.',
    en: 'I use Claude Code, Codex, MCP and AI agents heavily, with technical review and validation of what they deliver.',
  } satisfies L10n,

  contact: {
    email: 'bruno.anhezini@gmail.com',
    phoneDisplay: '(+55) 19 99403-4334',
    phoneE164: '+5519994034334',
    whatsapp: 'https://wa.me/5519994034334',
    linkedin: 'https://www.linkedin.com/in/brskt-dev/',
    linkedinHandle: 'in/brskt-dev',
    github: 'https://github.com/brskt-dev',
    githubHandle: 'brskt-dev',
  },
  siteRepo: 'https://github.com/brskt-dev/brskt-space',

  experience: [
    {
      role: { pt: 'Desenvolvedor Full Stack', en: 'Full Stack Developer' },
      company: 'On Tech & Co',
      start: '2025-04',
      end: null,
      location: { pt: 'Americana, SP', en: 'Americana, SP, Brazil' },
      mode: { pt: 'Presencial', en: 'On-site' },
      highlights: [
        {
          pt: 'Atuação ponta a ponta na Comunidade On, plataforma SaaS baseada em microsserviços, participando de todas as camadas do produto: interfaces Angular, APIs e workers .NET, SQL Server e infraestrutura de produção.',
          en: 'End-to-end work on Comunidade On, a microservices-based SaaS platform, across every layer of the product: Angular interfaces, .NET APIs and workers, SQL Server and production infrastructure.',
        },
        {
          pt: 'Modelagem de domínios e dados, implementação de regras de negócio, contratos de API, autenticação e permissões para diferentes perfis e aplicações da plataforma.',
          en: 'Domain and data modeling, business rules, API contracts, authentication and permissions for the platform’s different user profiles and applications.',
        },
        {
          pt: 'Desenvolvimento de integrações orientadas a eventos e funcionalidades em tempo real utilizando Kafka, Redis, CDC/Debezium, Centrifugo e Infobip.',
          en: 'Event-driven integrations and real-time features using Kafka, Redis, CDC/Debezium, Centrifugo and Infobip.',
        },
        {
          pt: 'Estruturação e operação dos ambientes de desenvolvimento, homologação e produção com Docker Swarm, Traefik e Portainer, incluindo redes, secrets, réplicas, health checks e rollback.',
          en: 'Set up and ran the development, staging and production environments with Docker Swarm, Traefik and Portainer, including networks, secrets, replicas, health checks and rollback.',
        },
        {
          pt: 'Criação e manutenção de pipelines no GitHub Actions para build, versionamento e deploy automatizado de múltiplas aplicações e serviços.',
          en: 'Built and maintained GitHub Actions pipelines for building, versioning and automatically deploying multiple applications and services.',
        },
        {
          pt: 'Sustentação de produção, troubleshooting, análise de desempenho, segurança, documentação técnica e participação nas decisões de arquitetura, produto e experiência do usuário.',
          en: 'Production support, troubleshooting, performance analysis, security and technical documentation, plus a part in architecture, product and user experience decisions.',
        },
      ],
      tech: [
        'C#',
        '.NET 8/9',
        'Angular',
        'TypeScript',
        'SQL Server',
        'Redis',
        'Kafka',
        'Debezium',
        'Docker Swarm',
        'Traefik',
        'GitHub Actions',
        'Centrifugo',
        'Infobip',
      ],
    },
    {
      role: { pt: 'Desenvolvedor Full Stack', en: 'Full Stack Developer' },
      company: 'Arppen',
      start: '2022-06',
      end: '2025-04',
      location: { pt: 'Americana, SP', en: 'Americana, SP, Brazil' },
      mode: { pt: 'Presencial', en: 'On-site' },
      highlights: [
        {
          pt: 'Desenvolvimento ponta a ponta de uma solução de gestão de facilities que conectava dispositivos embarcados ESP32 e nRF52 a uma plataforma SaaS.',
          en: 'End-to-end development of a facilities management solution that connected ESP32 and nRF52 embedded devices to a SaaS platform.',
        },
        {
          pt: 'Desenvolvimento de firmware, atualizações OTA e integração dos dispositivos com serviços backend, participando também de decisões de hardware e desenho de PCB.',
          en: 'Firmware development, OTA updates and device integration with backend services, also taking part in hardware decisions and PCB design.',
        },
        {
          pt: 'Construção de APIs em .NET, modelagem de dados no SQL Server e desenvolvimento de interfaces Angular, abrangendo coleta de dados, regras de negócio e operação web.',
          en: 'Built .NET APIs, SQL Server data models and Angular interfaces, covering data collection, business rules and web operations.',
        },
        {
          pt: 'Estruturação dos ambientes com Docker Swarm e pipelines de CI/CD, incluindo versionamento, deploy automatizado, health checks e estratégias de rollback.',
          en: 'Set up the environments with Docker Swarm and CI/CD pipelines, including versioning, automated deployment, health checks and rollback strategies.',
        },
      ],
      tech: ['C#', '.NET', 'Angular', 'TypeScript', 'SQL Server', 'ESP32', 'nRF52', 'firmware', 'OTA', 'Docker Swarm', 'CI/CD'],
    },
    {
      role: { pt: 'Desenvolvedor de Software', en: 'Software Developer' },
      company: 'PVS Contábil',
      start: '2016-06',
      end: '2022-06',
      location: { pt: 'São Paulo, SP', en: 'São Paulo, SP, Brazil' },
      mode: { pt: 'Remoto', en: 'Remote' },
      highlights: [
        {
          pt: 'Desenvolvimento e sustentação de sistemas internos utilizados em processos contábeis e fiscais, trabalhando com Delphi, SQL Server e regras de negócio críticas.',
          en: 'Built and maintained internal systems used in accounting and tax processes, working with Delphi, SQL Server and critical business rules.',
        },
        {
          pt: 'Modernização gradual do ambiente legado por meio de APIs .NET, integrações com sistemas de terceiros e automações para processos fiscais e operacionais.',
          en: 'Gradually modernized the legacy environment through .NET APIs, third-party system integrations and automations for tax and operational processes.',
        },
        {
          pt: 'Modelagem de dados, digitalização de fluxos internos e suporte à infraestrutura de TI, redes e rotinas essenciais da operação.',
          en: 'Data modeling, digitization of internal workflows and support for IT infrastructure, networks and essential operational routines.',
        },
      ],
      tech: [
        'Delphi',
        'C#',
        '.NET',
        'SQL Server',
        { pt: 'APIs REST', en: 'REST APIs' },
        'AutoIt',
        { pt: 'integrações', en: 'integrations' },
        { pt: 'infraestrutura de TI', en: 'IT infrastructure' },
      ],
    },
  ] satisfies ExperienceEntry[],

  skills: [
    {
      name: { pt: 'Desenvolvimento principal', en: 'Core development' },
      items: {
        pt: 'C#, .NET 8/9, ASP.NET Core, Angular, TypeScript, HTML, SCSS, PrimeNG.',
        en: 'C#, .NET 8/9, ASP.NET Core, Angular, TypeScript, HTML, SCSS, PrimeNG.',
      },
    },
    {
      name: { pt: 'Backend e arquitetura', en: 'Backend and architecture' },
      items: {
        pt: 'APIs REST, microsserviços, workers, modelagem de domínio, contratos de API, autenticação, autorização e integração entre serviços.',
        en: 'REST APIs, microservices, workers, domain modeling, API contracts, authentication, authorization and service-to-service integration.',
      },
    },
    {
      name: { pt: 'Dados e mensageria', en: 'Data and messaging' },
      items: {
        pt: 'SQL Server, modelagem relacional, Redis, Kafka, CDC e Debezium.',
        en: 'SQL Server, relational modeling, Redis, Kafka, CDC and Debezium.',
      },
    },
    {
      name: { pt: 'Tempo real e integrações', en: 'Real time and integrations' },
      items: {
        pt: 'WebSockets, Centrifugo, Infobip e integração com APIs externas.',
        en: 'WebSockets, Centrifugo, Infobip and integration with external APIs.',
      },
    },
    {
      name: { pt: 'Infraestrutura e entrega', en: 'Infrastructure and delivery' },
      items: {
        pt: 'Docker, Docker Swarm, Traefik, Portainer, GitHub Actions, CI/CD, Linux, Cloudflare e gestão de ambientes.',
        en: 'Docker, Docker Swarm, Traefik, Portainer, GitHub Actions, CI/CD, Linux, Cloudflare and environment management.',
      },
    },
    {
      name: { pt: 'Operação de produção', en: 'Production operations' },
      items: {
        pt: 'Health checks, gestão de secrets, réplicas de serviços, estratégias de rollback, observabilidade, troubleshooting, análise de desempenho e documentação técnica.',
        en: 'Health checks, secrets management, service replicas, rollback strategies, observability, troubleshooting, performance analysis and technical documentation.',
      },
    },
    {
      name: { pt: 'Agentes de código', en: 'Coding agents' },
      items: {
        pt: 'Claude Code, OpenAI Codex, Model Context Protocol (MCP), engenharia de contexto, fluxos multiagente, delegação de tarefas, revisão e validação de código.',
        en: 'Claude Code, OpenAI Codex, Model Context Protocol (MCP), context engineering, multi-agent workflows, task delegation, code review and validation.',
      },
    },
    {
      name: { pt: 'Experiência complementar', en: 'Additional experience' },
      items: {
        pt: 'Delphi, WPF, WebView2, Playwright, ESP32, nRF52, firmware embarcado, OTA e integração entre sistemas embarcados e SaaS.',
        en: 'Delphi, WPF, WebView2, Playwright, ESP32, nRF52, embedded firmware, OTA and integration between embedded systems and SaaS.',
      },
    },
  ] satisfies SkillGroup[],

  education: [
    {
      degree: {
        pt: 'Tecnólogo em Análise e Desenvolvimento de Sistemas',
        en: 'Associate degree in Systems Analysis and Development (Tecnólogo)',
      },
      institution: 'Universidade Paulista (UNIP)',
      completed: { pt: 'Concluído em dezembro de 2024', en: 'Completed in December 2024' },
      location: { pt: 'Americana, SP', en: 'Americana, SP, Brazil' },
      note: {
        pt: 'Formação iniciada na FATEC Americana e concluída na UNIP após transferência.',
        en: 'Started at FATEC Americana and completed at UNIP after a transfer.',
      },
    },
  ] satisfies EducationEntry[],

  languages: [
    { name: { pt: 'Português', en: 'Portuguese' }, level: { pt: 'nativo', en: 'native' }, code: 'pt' },
    { name: { pt: 'Inglês', en: 'English' }, level: { pt: 'intermediário', en: 'intermediate' }, code: 'en' },
    { name: { pt: 'Espanhol', en: 'Spanish' }, level: { pt: 'básico', en: 'basic' }, code: 'es' },
  ] satisfies SpokenLanguage[],
};

export type Profile = typeof profile;

/** Resolve a string-or-{pt,en} value. */
export const l10n = (value: string | L10n, lang: Lang): string => (typeof value === 'string' ? value : value[lang]);

/** "04/2025" (pt) / "Apr 2025" (en). */
export function formatMonth(lang: Lang, ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (lang === 'pt') return `${String(m).padStart(2, '0')}/${y}`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
