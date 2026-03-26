# Emergency Centre Wiki

Emergency Centre is an open-source multi-signal monitoring platform built for public-first coverage monitoring.

It currently includes:

- a React frontend
- built-in starter coverage zones for the United Kingdom and United States
- postcode and ZIP lookup
- an optional local Node API
- live briefing endpoints backed by official providers for the built-in starter zones
- demo briefing endpoints as a fallback when you want a deterministic local feed

Project links:

- Repository: https://github.com/Ninezel/emergency-centre
- Issues: https://github.com/Ninezel/emergency-centre/issues
- Ko-Fi: https://ko-fi.com/ninezel

## Best Starting Point

If you just want to get the project running, follow [[Quick Start]].

If you want to understand how the starter directory works, go to [[Coverage Zones]].

If you want to wire in real providers, go to [[Connect Real Feeds]].

If you want to run or extend the local API, go to [[API Services]].

## Typical Paths

### 1. I just want to see the app working

Follow:

1. [[Quick Start]]
2. [[Coverage Zones]]

### 2. I want to run the local API and starter live briefings

Follow:

1. [[Quick Start]]
2. [[API Services]]
3. [[Self Hosting]]

### 3. I want to connect real alert or monitoring feeds

Follow:

1. [[Quick Start]]
2. [[Connect Real Feeds]]
3. [[Security Model]]

## Core Concepts

- `Coverage area`: a named monitoring zone with codes, aliases, coordinates, and a briefing URL
- `Signals`: normalized weather, infrastructure, transport, airspace, public-safety, or other monitoring items
- `Starter directory`: built-in bootstrap coverage data for supported countries
- `Live briefing`: normalized feed data served by the local API from allowlisted official providers
- `Demo briefing`: generated fallback feed data served by the local API

## Main Pages

- [[Quick Start]]
- [[Coverage Zones]]
- [[Connect Real Feeds]]
- [[API Services]]
- [[Self Hosting]]
- [[Security Model]]
- [[FAQ]]
