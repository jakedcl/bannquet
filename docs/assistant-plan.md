# Bannquet assistant: build plan

An agentic, retrieval-grounded assistant ("Ask Bannquet") that answers questions about mountain weather, snow and avalanche conditions, peaks and pins, with cited sources.

## Principles
- **The assistant never depends on page layout.** It talks to a typed tools API that wraps the data layer (`readPlace*` aggregators, Neon). Restructuring weather pages must not touch the assistant.
- **AI is optional.** Weather and map pages keep working with no keys (AGENTS.md rule). No key means no `/ask`, not a broken site.
- **Read-only by default.** Anything that writes (save a pin, add to a trip) is proposed by the agent and confirmed by the user.
- **Route privacy holds.** Tools use `routeCutSql` / `shownLineSql`, never raw route geometry.
- **Cheap and capped.** Rate limits and a GCP budget alert from day one.
- **DB changes follow `docs/environments.md`.** Write SQL with `IF NOT EXISTS`; do not apply it. Preview branch first.

## Architecture

```
Next.js (Vercel)  ->  Python agent service (FastAPI, GCP Cloud Run)  ->  Vertex AI
   /ask chat UI           tool loop, RAG, SSE streaming, tracing
                                |
                                v
              Bannquet tools API (Next route handlers, service-token auth)
              thin adapter over readPlace* and Neon (pgvector)
```

Layout: `services/assistant/` (Python), `src/lib/assistant/` (tool adapter, no imports from page components), `evals/` (golden set), `infra/` (Terraform).

## Phases

| # | Phase | Deliverable | Job requirement it shows |
|---|---|---|---|
| 0 | Setup | GCP project (free tier), budget alert, folder layout, provider choice (Vertex AI) | cloud basics |
| 1 | Tools API (TypeScript) | `getPlaceConditions` facade, 4-6 typed read-only tools with zod schemas, authenticated internal route, a test per tool | APIs, testing, tool integration |
| 2 | Python agent service | FastAPI + pydantic, tool-calling loop, SSE streaming, structured logs, pytest with a fake LLM | Python, agentic workflows |
| 3 | RAG | pgvector on Neon, ingestion job (NWS discussions, avalanche bulletins, advisories), hybrid search, cited answers | embeddings, vector DB, RAG |
| 4 | Chat UI + human-in-the-loop | `/ask` page, streamed answers, citations, feedback, confirm-to-write actions, sign-in + rate limits | full-stack, human-in-the-loop |
| 5 | Evals + observability | ~50-question golden set (deterministic checks on tool use and citations, plus LLM judge), tracing, cost/latency, evals gate CI | testing, monitoring AI systems |
| 6 | Cloud delivery | Dockerfile, Terraform (Cloud Run, Secret Manager, Artifact Registry), GitHub Actions CI/CD with workload identity federation. Stretch: GKE Autopilot manifests | GCP, Kubernetes, CI/CD, IaC |
| 7 | Responsible AI | untrusted-text handling (prompt injection), tool allowlist, audit log of tool calls, route-privacy tests, mountain-safety disclaimer, short risk write-up | governance, security, compliance |
| 8 | Portfolio | architecture diagram, README with eval and latency/cost numbers, demo video, writeup, resume bullets | communication |

## Fastest path to "apply now"
Phases 1-4 are the MVP. Phase 5 (evals) is the biggest differentiator and should be at least minimal before applying. Phase 6 covers the GCP/CI/IaC lines. Phases 7-8 can overlap with applying, but write the Phase 8 README as you go.

## Caveats
- GCP and model calls cost money. Cap with rate limits and a budget alert.
- Kubernetes (GKE) is a stretch goal: Cloud Run is the default.
- Adds a second language (Python) to a TypeScript repo. Intentional, to match the role.
- No CI exists today (a redundant workflow was removed); Phase 6 adds the first real one.
