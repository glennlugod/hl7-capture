# Contributing to HL7-Capture

Thank you for considering contributing to HL7-Capture! This document outlines how to get started and the conventions we follow to keep the project consistent and high-quality.

1. Getting started

---

- Fork the project and clone to your local machine.
- Install dependencies:

```pwsh
npm install
```

- Set up Npcap if you're working on native capture features (Windows):

```pwsh
npm run postinstall
```

2. Development

---

- Run the full app (main + renderer dev servers):

```pwsh
npm run dev
```

- To run the renderer only (fast iteration):

```pwsh
npm run dev:renderer
```

3. Testing

---

- Run tests locally:

```pwsh
npm test
```

- Run a single test in watch mode:

```pwsh
npm run test:watch
```

4. Code Style & Linting

---

- Keep TypeScript types strict and add tests for critical features you modify.
- Run the linter and formatter before committing:

```pwsh
npm run lint
npm run format
```

5. Branch & Pull Request Process

---

- Create branches using descriptive names: `feature/<short-desc>`, `fix/<short-desc>`, `docs/<short-desc>`.
- Follow conventional commit messages and include a brief description of what the PR changes.
- Include tests for behavior changes and add unit tests for new features.
- When opening a PR, describe the problem, the solution, and any additional steps a reviewer should take.

6. Code Review Checklist

---

- [ ] Code compiles without type errors.
- [ ] Tests added or updated (if necessary) and are passing.
- [ ] Lint is passing and code is formatted.
- [ ] The change has clear scope and does not modify unrelated files.

7. Security & Privacy

---

- This repository handles potentially sensitive data (HL7). Please avoid committing PHI/PII to the repository, and sanitize any sample data used in tests, stories, or docs.

8. Documentation

---

- Update the `docs/` files if you add features or change behavior in a way that affects usage, deployment, or testing.
- The `docs/` folder contains the main generated docs this project uses for internal documentation. Use the `bmad` workflow if you wish to automatically generate new doc artifacts.

Thanks again for contributing to HL7-Capture!
