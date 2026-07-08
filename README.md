# AppDirect Skills

Agent skills for [AppDirect](https://www.appdirect.com/) marketplace work — usable with Claude Code, Cowork, and any Claude client that loads [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills).

Built by Jason Brashear ([Titanium Computing](https://jasonbrashear.com)). Verified against [developer.appdirect.com](https://developer.appdirect.com) on 2026-07-08.

## Skills

| Skill | What it does |
|---|---|
| [`appdirect-submission`](.claude/skills/appdirect-submission) | App submission runbook — take a SaaS product from zero to approved publication with a 100% profile-completion score. Covers the scoring segments, the publication-request flow, and rejection recovery. |
| [`appdirect-api-integration`](.claude/skills/appdirect-api-integration) | Platform API integration — OAuth clients & scopes, GraphQL product/edition/pricing mutations, event-notification endpoints, SSO (OIDC/SAML/bookmark), inbound/outbound credentials, and ping tests. Ships TypeScript scaffolds. |

Each skill verifies claims against AppDirect's AI-readable doc dumps (`llms.txt`, `llms-full.txt`, `schema/llms-full.txt`) rather than trusting memory, so field names and API status stay current.

## Install

**Copy the folders** into your skills directory:

```bash
# Global (all projects)
cp -R .claude/skills/appdirect-* ~/.claude/skills/

# Or per-project
cp -R .claude/skills/appdirect-* /path/to/project/.claude/skills/
```

**Or import the packaged bundles** in `dist/` (`.skill` files) through your Claude client's skill importer.

Skills activate automatically when your request matches — e.g. "submit my product to AppDirect", "why is my completion score stuck", "scaffold AppDirect event endpoints", "createProduct mutation fails".

## License

MIT — see [LICENSE](LICENSE).
