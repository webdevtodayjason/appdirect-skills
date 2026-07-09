<div align="center">

# AppDirect Skills

**Agent Skills for [AppDirect](https://www.appdirect.com/) marketplace work** — usable with Claude Code, Cowork, and any Claude client that loads [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Claude-Agent_Skills-D97757?style=for-the-badge&logo=anthropic&logoColor=white)](https://docs.claude.com/en/docs/claude-code/skills)
[![AppDirect Docs](https://img.shields.io/badge/Verified_Against-developer.appdirect.com-1f6feb?style=for-the-badge)](https://developer.appdirect.com)
[![Context7](https://img.shields.io/badge/Context7-AppDirect_llms--full.txt-6E56CF?style=for-the-badge)](https://context7.com/llmstxt/developer_appdirect_llms-full_txt)

[![Website](https://img.shields.io/badge/jasonbrashear.com-000000?style=flat-square&logo=safari&logoColor=white)](https://jasonbrashear.com)
[![Substack](https://img.shields.io/badge/Frontier_Operations-FF6719?style=flat-square&logo=substack&logoColor=white)](https://jasonbrashear.substack.com)
[![GitHub](https://img.shields.io/badge/webdevtodayjason-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/webdevtodayjason)
[![X](https://img.shields.io/badge/@argentAIOS-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/argentAIOS)
[![LinkedIn](https://img.shields.io/badge/jasonbrashear-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/jasonbrashear/)

</div>

---

## What's in here

Two production-tested skills that teach Claude the AppDirect ISV workflow — the submission process and the platform APIs — so it stops hallucinating mutation names and missing the manual steps that stall publications.

| Skill | What it does |
|---|---|
| [`appdirect-submission`](.claude/skills/appdirect-submission) | **App submission runbook** — take a SaaS product from zero to approved publication with a 100% profile-completion score. Covers the six scoring segments (with exact GraphQL/REST field names), the publication-request flow, immutable core-data decisions, rejection recovery, and the human blockers (Marketplace Manager approval, the manual UI-only Integration report, EA API gating). |
| [`appdirect-api-integration`](.claude/skills/appdirect-api-integration) | **Platform API integration** — OAuth clients & scopes, GraphQL product/edition/pricing mutations, event-notification endpoints (`SUBSCRIPTION_ORDER`/`CHANGE`/`CANCEL`, `USER_ASSIGNMENT`), SSO (OIDC/SAML/bookmark), inbound vs. outbound credentials, ping tests, and a debugging quick-table. Ships TypeScript scaffolds for the event handlers and OAuth token client. |

### Why these exist

AppDirect's product APIs are Early Availability and its docs are spread across user guides, two API references, and a help portal. Untrained models reliably invent mutation names (`createIntegrationConfiguration` instead of `createProductIntegration`), invert the credential directions, and never mention `userErrors` or `lastTest` — the two things you actually need when calls fail. These skills bake in the verified sequences and point Claude at AppDirect's AI-readable doc dumps for anything that might have changed:

- [`developer.appdirect.com/llms.txt`](https://developer.appdirect.com/llms.txt) — doc page index
- [`developer.appdirect.com/llms-full.txt`](https://developer.appdirect.com/llms-full.txt) — full documentation dump
- [`developer.appdirect.com/schema/llms-full.txt`](https://developer.appdirect.com/schema/llms-full.txt) — GraphQL schema dump
- [Context7: AppDirect docs](https://context7.com/llmstxt/developer_appdirect_llms-full_txt) — indexed and queryable via the [Context7 MCP](https://context7.com), curated by yours truly

### Benchmarked

Each skill was tested against baseline (no-skill) runs on realistic tasks, graded on doc-verified assertions:

| Skill | With skill | Baseline | Notable baseline failures |
|---|---|---|---|
| `appdirect-submission` | **100%** (12/12) | 62% | Missed the manual Integration report; claimed submission isn't score-gated |
| `appdirect-api-integration` | **100%** (12/12) | 50% | Hallucinated mutation names & input shapes; inverted credential directions; no `userErrors`/`lastTest` |

## Repo layout

```
.claude/skills/
├── appdirect-submission/
│   ├── SKILL.md                        # triggering + workflow + hard-won rules
│   └── references/
│       └── submission-checklist.md     # full phased runbook w/ exact field names
└── appdirect-api-integration/
    ├── SKILL.md                        # workflow + debugging quick-table
    ├── references/
    │   ├── graphql-mutations.md        # verified copy-paste mutations, every step
    │   └── auth-and-scopes.md          # grant types, scopes ↔ roles, credential directions
    └── assets/scaffold/
        ├── event-handlers.ts           # Express endpoints for all marketplace events
        └── oauth-client.ts             # client-credentials token helper + GraphQL/REST client
dist/                                   # packaged .skill bundles for client import
```

## Install

**Option 1 — copy the folders** into your skills directory:

```bash
# Global (all projects)
cp -R .claude/skills/appdirect-* ~/.claude/skills/

# Or per-project
cp -R .claude/skills/appdirect-* /path/to/project/.claude/skills/
```

**Option 2 — import the packaged bundles**: open the `.skill` files in [`dist/`](dist/) with your Claude client's skill importer (Cowork and Claude Desktop render a "Save skill" button).

Skills activate automatically when your request matches — e.g. *"submit my product to AppDirect"*, *"why is my completion score stuck at 85%"*, *"scaffold AppDirect event endpoints"*, *"my createProduct mutation fails with no detail"*.

## Caveats you should know

- AppDirect's product GraphQL APIs are **Early Availability**; the async publication API additionally requires enablement by an AppDirect technical representative.
- Exact input shapes can vary by marketplace version — the skills instruct Claude to verify via schema introspection or the llms.txt dumps before running mutations against a live marketplace.
- Publication approval is a **human** Marketplace Manager decision; a 100% completion score is necessary but not sufficient.

## Credits

Built by **[Jason Brashear](https://jasonbrashear.com)** — Director of AI Development & Cybersecurity at [Titanium Computing](https://jasonbrashear.com), founder of [ArgentOS.ai](https://argentos.ai), building software since 1994 and AI-powered SaaS since before it was cool.

- 🌐 Website: [jasonbrashear.com](https://jasonbrashear.com)
- ✍️ Substack: [Frontier Operations](https://jasonbrashear.substack.com) — intent engineering, agentic architecture, frontier ops
- 🛰️ Open standards: [frontierinfra.org](https://frontierinfra.org)
- 📺 YouTube: [@titaniumcomputing](https://youtube.com/@titaniumcomputing)

Verified against [developer.appdirect.com](https://developer.appdirect.com) on **2026-07-08**. AppDirect is a trademark of AppDirect, Inc.; this is an independent community project, not affiliated with or endorsed by AppDirect.

## License

MIT — see [LICENSE](LICENSE).
