<picture>
  <source srcset="./.github/logo-dark.png" media="(prefers-color-scheme: light)">
  <source srcset="./.github/logo-white.png" media="(prefers-color-scheme: dark)">
  <img src="./.github/logo-dark.png" alt="IT Tools logo">
</picture>

# IT Tools — ePlus.DEV Edition

A developer-focused fork of [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools), maintained by [David Nguyen](https://github.com/hoangsvit) and deployed at **https://tools.eplus.dev**.

This fork keeps the large collection of privacy-friendly browser tools from upstream, while adding its own discovery, sharing, SEO and developer-experience layer.

## What is different in this fork?

| ePlus.DEV enhancement | Why it matters |
| --- | --- |
| **Smart Launcher** | `Ctrl/Cmd + K` prioritizes recently used tools, favorites and quick actions before full-text search. |
| **Local recent history** | Remembers the tools you actually use most. History stays in browser storage and can be cleared from the launcher. |
| **Smart Related Tools** | Every tool recommends useful next tools based on category and shared keywords. |
| **Quick Share** | Copy a clean canonical tool URL directly from each tool page. |
| **SEO-first routes** | Dynamic canonical URLs, Open Graph/Twitter metadata, structured data, sitemap generation and noindex handling for 404 pages. |
| **Fork ownership metadata** | GitHub, social and package metadata point to the ePlus.DEV-maintained fork while preserving upstream credit. |
| **Hardened CI** | Unit tests, type checking, production builds and Playwright E2E are kept green on a Playwright-compatible runner. |

### Privacy by design

Recent-tool history is stored locally in the browser. It is not synced to a server by this feature. Use **Clear recent tools** from the Smart Launcher whenever you want to remove it.

## Live site

**https://tools.eplus.dev**

## Keyboard workflow

- `Ctrl + K` on Windows/Linux or `Cmd + K` on macOS: open Smart Launcher
- `↑` / `↓`: move through results
- `Enter`: open the selected tool or action
- `Esc`: close the launcher

## Development

### Requirements

- Node.js compatible with the repository `.nvmrc`
- pnpm 9

### Install

```sh
pnpm install
```

### Run locally

```sh
pnpm dev
```

### Quality checks

```sh
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

The production build also generates `public/sitemap.xml` from registered tool routes.

## Self-host this fork

Build the repository so your image contains the ePlus.DEV enhancements instead of using an upstream prebuilt image:

```sh
docker build -t eplus-it-tools .
docker run -d --name eplus-it-tools --restart unless-stopped -p 8080:80 eplus-it-tools
```

Then open `http://localhost:8080`.

## Add a new tool

```sh
pnpm run script:create:tool my-tool-name
```

The generator creates the tool boilerplate. Add the generated tool to the appropriate category and include unit tests for reusable logic.

## Issues and feature requests

For changes specific to this edition, use this fork's issue tracker:

- Bugs: https://github.com/hoangsvit/it-tools/issues
- Source: https://github.com/hoangsvit/it-tools

For upstream behavior or upstream contributions, see the original project at https://github.com/CorentinTh/it-tools.

## Upstream attribution

This repository is a fork of **IT Tools**, originally created by [Corentin Thomasset](https://corentin.tech). The original project and its contributors remain the foundation of this edition.

The ePlus.DEV edition adds and maintains fork-specific functionality without removing that attribution.

## License

GNU GPLv3 — see [LICENSE](./LICENSE).
