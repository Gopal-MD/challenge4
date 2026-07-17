# Contributing to FanOps Unified

Thank you for choosing to contribute to FanOps Unified! We appreciate your support in improving the tournament experience for the FIFA World Cup 2026.

## Development Workflow

1.  **Fork the Repository** and clone it locally.
2.  **Create a Feature Branch** from the main branch:
    ```bash
    git checkout -b feature/my-amazing-feature
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Verify local setup**:
    Run tests to ensure everything is correct:
    ```bash
    npm run test
    ```
5.  **Commit changes** conforming to standard conventions.
6.  **Create a Pull Request** describing your additions and changes.

## Code Quality Standards

*   All async operations must include structured try-catch error boundary handling.
*   Enforce the unified API JSON Contract: `{ success, data, error }`.
*   Maintain clean, modular components under `src/components/` and server helpers under `src/lib/`.
*   All tests must mock external network calls (such as Groq or Maps APIs).
