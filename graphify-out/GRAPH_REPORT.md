# Graph Report - .  (2026-04-13)

## Corpus Check
- Corpus is ~3,848 words - fits in a single context window. You may not need a graph.

## Summary
- 31 nodes · 36 edges · 7 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Social Icons & Navigation|Social Icons & Navigation]]
- [[_COMMUNITY_Build Tooling & Linting|Build Tooling & Linting]]
- [[_COMMUNITY_Hero UI & Brand Assets|Hero UI & Brand Assets]]
- [[_COMMUNITY_React App Core|React App Core]]
- [[_COMMUNITY_Source Entry Files|Source Entry Files]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]

## God Nodes (most connected - your core abstractions)
1. `SVG Icon Sprite Sheet` - 7 edges
2. `Next Steps Section UI` - 6 edges
3. `App React Component` - 5 edges
4. `ESLint Flat Configuration` - 5 edges
5. `React + TypeScript + Vite Template` - 5 edges
6. `Hero Section UI Layout` - 4 edges
7. `icons.svg Symbol Usage` - 4 edges
8. `Vite Build Configuration` - 3 edges
9. `Hot Module Replacement (HMR)` - 3 edges
10. `React Compiler Disabled - Performance Rationale` - 2 edges

## Surprising Connections (you probably didn't know these)
- `ESLint Type-Aware Rules Upgrade Path` --rationale_for--> `ESLint Flat Configuration`  [INFERRED]
  README.md → eslint.config.js
- `React Compiler Disabled - Performance Rationale` --rationale_for--> `App React Component`  [EXTRACTED]
  README.md → src/App.tsx
- `Next Steps Section UI` --references--> `GitHub Icon Symbol`  [EXTRACTED]
  src/App.tsx → public/icons.svg
- `Next Steps Section UI` --references--> `Discord Icon Symbol`  [EXTRACTED]
  src/App.tsx → public/icons.svg
- `Next Steps Section UI` --references--> `X (Twitter) Icon Symbol`  [EXTRACTED]
  src/App.tsx → public/icons.svg

## Hyperedges (group relationships)
- **Vite + React + TypeScript Project Stack** — viteconfig_vite_configuration, eslintconfig_eslint_configuration, apptsx_app_component, maintsx_entry_point, readme_project_template [INFERRED 0.95]
- **App UI Visual Assets** — assets_hero_png, assets_react_svg, assets_vite_svg, apptsx_hero_section [INFERRED 0.90]
- **Social Links Icon Set** — iconssvg_bluesky_icon, iconssvg_discord_icon, iconssvg_github_icon, iconssvg_x_icon, iconssvg_social_icon, apptsx_next_steps_section [EXTRACTED 1.00]

## Communities

### Community 0 - "Social Icons & Navigation"
Cohesion: 0.39
Nodes (9): icons.svg Symbol Usage, Next Steps Section UI, Bluesky Social Icon Symbol, Discord Icon Symbol, Documentation Icon Symbol, GitHub Icon Symbol, Social/Community Icon Symbol, SVG Icon Sprite Sheet (+1 more)

### Community 1 - "Build Tooling & Linting"
Cohesion: 0.31
Nodes (9): Hot Module Replacement (HMR), eslint-plugin-react-hooks, eslint-plugin-react-refresh (Vite HMR guard), typescript-eslint Integration, @vitejs/plugin-react (Oxc transform), ESLint Flat Configuration, ESLint Type-Aware Rules Upgrade Path, React + TypeScript + Vite Template (+1 more)

### Community 2 - "Hero UI & Brand Assets"
Cohesion: 0.4
Nodes (5): Hero Section UI Layout, Hero Image - Isometric Layered Panels (Purple/White), React Logo SVG (Spinning Atom), Vite Logo SVG (Lightning Bolt with Parentheses), Vite Lightning Bolt Favicon SVG

### Community 3 - "React App Core"
Cohesion: 0.5
Nodes (4): App React Component, Counter useState Hook, Application Entry Point, React Compiler Disabled - Performance Rationale

### Community 4 - "Source Entry Files"
Cohesion: 1.0
Nodes (0): 

### Community 5 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 6 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **8 isolated node(s):** `Application Entry Point`, `Counter useState Hook`, `ESLint Type-Aware Rules Upgrade Path`, `Vite Lightning Bolt Favicon SVG`, `React Logo SVG (Spinning Atom)` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Source Entry Files`** (2 nodes): `App.tsx`, `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App React Component` connect `React App Core` to `Social Icons & Navigation`, `Hero UI & Brand Assets`?**
  _High betweenness centrality (0.538) - this node is a cross-community bridge._
- **Why does `React + TypeScript + Vite Template` connect `Build Tooling & Linting` to `React App Core`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Why does `React Compiler Disabled - Performance Rationale` connect `React App Core` to `Build Tooling & Linting`?**
  _High betweenness centrality (0.352) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ESLint Flat Configuration` (e.g. with `ESLint Type-Aware Rules Upgrade Path` and `React + TypeScript + Vite Template`) actually correct?**
  _`ESLint Flat Configuration` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `React + TypeScript + Vite Template` (e.g. with `React Compiler Disabled - Performance Rationale` and `ESLint Flat Configuration`) actually correct?**
  _`React + TypeScript + Vite Template` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Application Entry Point`, `Counter useState Hook`, `ESLint Type-Aware Rules Upgrade Path` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._