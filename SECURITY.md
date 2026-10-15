# Security Policy

Quartet Web mengikuti responsible disclosure.

## Supported Versions

Hanya versi terbaru yang mendapat security update.

## Reporting a Vulnerability

Hubungi maintainer lewat GitHub Security Advisories tab (TBD — set up saat Phase 5).

## Pre-commit Security Checks

- Husky menjalankan `lint-staged` (lint + format).
- CI menjalankan `pnpm audit` (dependency vulnerabilities).
- Security review via `security-best-practices` skill dijalankan manual sebelum setiap push ke remote.