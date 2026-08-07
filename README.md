# IT Tools — ePlus.DEV Edition

A privacy-friendly collection of useful online tools for developers, maintained as the **ePlus.DEV Edition** of [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools).

- Production: https://tools.eplus.dev
- Fork source: https://github.com/hoangsvit/it-tools
- Maintainer: [David Nguyen](https://github.com/hoangsvit)
- Original project: [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools)

## What is different in this fork?

| Area | ePlus.DEV Edition |
| --- | --- |
| Navigation | ePlus Smart Launcher with recent tools, favorites, workflows and quick actions |
| Developer workflows | Curated multi-tool flows for API debugging, security, networking and JSON conversion |
| Discovery | Related-tool recommendations based on categories and shared keywords |
| History | Recently used tools stored locally in the browser |
| Sharing | Clean canonical tool links from Quick Share |
| SEO | Dynamic canonical/Open Graph/Twitter metadata, JSON-LD and generated sitemap |
| Analytics | GA4 SPA page-view tracking with localhost protection; Plausible removed |
| PWA | ePlus.DEV identity and direct shortcuts to key developer tools |
| CI | Fork-specific unit tests, workflow invariant tests, type checks, build and E2E coverage |

## Developer Workflows

The ePlus.DEV Edition includes curated tool chains for common development jobs:

### API Debugging

1. JWT Parser
2. URL Parser
3. JSON Viewer
4. HTTP Status Codes

### Security Toolkit

1. Password Strength Analyser
2. Hash Text
3. HMAC Generator
4. Bcrypt

### Network Troubleshooting

1. IPv4 Subnet Calculator
2. IPv4 Address Converter
3. IPv4 Range Expander
4. MAC Address Lookup

### JSON Conversion

1. JSON to YAML
2. JSON to TOML
3. JSON to XML
4. JSON to CSV

## ePlus Smart Launcher

Open the launcher with the keyboard shortcut shown in the app and search across:

- all tools
- recent tools
- favorite tools
- Developer Workflows
- quick actions such as random tool, dark mode, GitHub and issue reporting

When the search field is empty, the launcher prioritizes your local context instead of showing a generic alphabetical list.

## Local-first recent history

Recent-tool history is stored only in your browser. It is used to make the home page and Smart Launcher faster to navigate and can be cleared from the launcher at any time.

## Analytics

The ePlus.DEV deployment uses **Google Analytics 4** with measurement ID `G-RHM16CGF0T`.

- Vue Router navigation is tracked as SPA `page_view` events.
- Tracking is disabled automatically on localhost and loopback hosts.
- `VITE_GOOGLE_ANALYTICS_ENABLED` can disable GA4.
- `VITE_GOOGLE_ANALYTICS_ID` can override the measurement ID.
- Plausible is not used in this fork.

## Progressive Web App

When installed as a PWA, this fork appears as **ePlus.DEV IT Tools** and exposes shortcuts for:

- JWT Parser
- JSON Viewer
- URL Parser

## Development

### Requirements

- Node.js
- pnpm 9

### Install

```bash
pnpm install
```

### Run locally

```bash
pnpm dev
```

### Quality checks

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

Workflow tests validate deterministic workflow metadata and path invariants without coupling the unit suite to the complete runtime tool registry.

## Self-hosting

Clone this fork and build it directly:

```bash
git clone https://github.com/hoangsvit/it-tools.git
cd it-tools
pnpm install
pnpm build
```

The generated frontend can be served from any static hosting platform that supports SPA fallback routing.

## Contributing

Issues and improvements for the ePlus.DEV Edition belong in the fork repository:

https://github.com/hoangsvit/it-tools/issues

For upstream project development, see:

https://github.com/CorentinTh/it-tools

## Credits

IT Tools was originally created by **Corentin Thomasset** and contributors. This repository preserves that attribution while maintaining ePlus.DEV-specific product, UX, SEO, testing and deployment changes.

## License

GNU GPLv3.
