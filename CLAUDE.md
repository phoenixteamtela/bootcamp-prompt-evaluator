# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design Philosophy: Workflows First

- Default to structured workflows. Most problems are more structured than they appear.
- Only introduce agentic behavior at nodes where the next step genuinely cannot be anticipated.
- If it can be a deterministic step with clear inputs and outputs, it's a workflow node — not an agent task.

## Brand Identity

### Visual Standards

- Modern, clean UI — no browser-default styling on any element (dropdowns, selects, inputs, buttons)
- Consistent with PhoenixTeam branding across all outputs

### Typography

- **Primary font:** Sofia Pro (located in `assets/fonts/`)
- Apply Sofia Pro globally — never fall back to system fonts without explicit override

### Color Palette

- **Navy (PHOENIX):** `#2B3A57`
- **Orange (TEAM):** `#E8832A`
- **Phoenix Gradient:** orange `#E8832A` to deep orange `#D4691A`
- **Dark backgrounds:** `#000000` or `#1A1A2E`
- **Light text (reverse variants):** `#FFFFFF`

### Logo Assets

- All logo variants located in `assets/logos/`
- **Horizontal:** `PhoenixTeam_Horizontal_Gradient.png` (dark bg: use `_Reverse_Gradient`)
- **Horizontal w/ Bird in O:** `PhoenixTeam_Horizontal_O_Bird_Gradient.png` (dark bg: use `_Reverse_Gradient`)
- **Stacked:** `PhoenixTeam_Stacked_Gradient.png` (dark bg: use `_Reverse_Gradient`)
- **Bird icon only:** `PhoenixTeam_Bird_Gradient.png`
- Use gradient variants on light backgrounds, reverse gradient variants on dark backgrounds

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy (Scoped Autonomy)

- Subagents are workflow nodes with bounded autonomy — not free-roaming agents
- Use subagents to keep main context window clean and for parallel execution
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent with clear inputs, expected outputs, and exit criteria
- Always prefer a deterministic workflow step before delegating to a subagent

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing (Scoped Exception)

- This is a deliberate agentic node — bug diagnosis requires adaptive reasoning
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

## Core Principles

- **Workflows First:** Default to structured, deterministic workflows. Introduce agentic behavior only at nodes that genuinely require adaptive reasoning.
- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.
