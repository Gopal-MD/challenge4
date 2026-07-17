# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-07-17

### Added
- **RESTful API Architecture**: Implemented modular routing under `/api/` (`system.ts`, `healthz.ts`, `stadium.ts`, `assistant.ts`).
- **Unified JSON Contract Middleware**: Standardized API responses to use the `{ success, data, error }` layout.
- **Mock-Enabled Vitest API Suite**: Added comprehensive unit test coverage for validation rules and error scenarios without calling external APIs.
- **FIFA 2026 Problem Matrix**: Integrated high-fidelity matrices into the repository README.
- **Vite 8 ESM Bundler Support**: Rewrote `vite.config.ts` to use standard ESM plugins directly, resolving ESM/CJS runtime conflicts.

### Fixed
- Fixed Rolldown native dependency resolution on Windows systems.
- Configured `.gitignore` to prevent committing build logs, reports, and coverage files.
