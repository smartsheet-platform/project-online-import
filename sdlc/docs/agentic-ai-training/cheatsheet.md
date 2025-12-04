# Agentic AI Cheatsheet

**One-page quick reference** for daily work. For explanations, see [Best Practices](https://git.lab.smartsheet.com/community/sdlc-template/-/blob/main/docs/agentic-ai-training/08-best-practices-advanced.md).

---

## 🔧 Tool Equivalence

> **Roo** uses mode switching (e.g., `architect` mode) | **Claude Code** uses Task delegation (e.g., `architect` agent)
>
> **Both provide identical capabilities** - the table below shows role equivalence.

---

## 🤖 Role Selector

| Task | Specialized Role | Roo Mode | Claude Code Agent |
|------|------------------|----------|-------------------|
| Planning/Architecture | 🏗️ Architect | `architect` | `architect` |
| Documentation | 📊 Spec Writer | `spec` | `spec-writer` |
| Code Implementation | 💻 Implementer | `code` | `implementer` |
| API Integration* | 🔌 API Client Specialist | `api-client-code` | `api-client-specialist` |
| Environment/Setup | 🔧 Environment Troubleshooter | `dev-env` | `env-troubleshooter` |
| Code Review | 🔄 MR Processor | `mr-actions` | `mr-processor` |
| Complex Projects | 🎯 Orchestrator | `orchestrator` | general-purpose |

*Auto-delegated from Implementer

---

## 🔀 Delegation Patterns

**Roo Example**:
```
Code mode → API Client Code mode (API work)
Code mode → Dev Env mode (environment issues)
```

**Claude Code Example**:
```
implementer agent → api-client-specialist agent (API work)
implementer agent → env-troubleshooter agent (environment issues)
```

**Universal Rule**: Trust delegation - specialists produce better results regardless of tool.

---

## 💾 Memory Banks

| Working On | Use |
|------------|-----|
| Smartsheet Agentic SDLC (`.roomodes`, `sdlc/`) | `sdlc/memory-bank/` |
| Application features | `memory-bank/` |

---

## 🔧 Quick Fixes

| Problem | Fix |
|---------|-----|
| Roles not available | **Roo**: Reload VSCode \| **Claude Code**: Verify agent setup |
| Memory bank error | Invoke Architect role (auto-creates) |
| Wrong role | **Roo**: Switch modes \| **Claude Code**: Create new Task with correct agent |
| Environment error | Use Environment Troubleshooter role |

---

## 📚 More Info

- [Quick Start](quick-start.md) - 5-minute intro
- [Getting Started](https://git.lab.smartsheet.com/community/sdlc-template/-/blob/main/docs/agentic-ai-training/07-getting-started.md) - Complete setup
- [Best Practices](https://git.lab.smartsheet.com/community/sdlc-template/-/blob/main/docs/agentic-ai-training/08-best-practices-advanced.md) - Detailed guidance
