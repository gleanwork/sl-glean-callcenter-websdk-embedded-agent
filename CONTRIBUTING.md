# Contributing

Thanks for your interest in improving this Glean embedded-agent example.

This repository is intentionally small: a static HTML/CSS/JavaScript site in `site/` plus an AWS CDK app in `lib/` and `bin/`. Contributions should keep the sample easy to understand, public-safe, and deployable without secrets.

## Before You Start

1. Fork the repository.
2. Create a feature branch.
3. Read `README.md`, `AGENTS.md`, and `SECURITY.md`.
4. Confirm your change does not require committing customer-specific Glean or AWS configuration.

## Public-Safety Rules

- Do not commit API keys, OAuth secrets, AWS credentials, Glean API tokens, or customer data.
- Do not hardcode customer-specific Glean Agent IDs, backend URLs, web app URLs, or AWS account IDs.
- Keep Glean deployment values runtime-configurable through URL parameters, local storage, or a customer's own wrapper.
- If changing Content Security Policy, update both `site/index.html` and `lib/static-site-stack.ts`.
- Keep the default CDK deployment usable without a custom domain.

## Validation

Run the full local validation suite before opening a pull request:

```bash
npm install
npm run check
npm run audit
npm run build
npm test
npm run cdk:synth
```

For a local preview:

```bash
npm start
```

Then open `http://localhost:8080`.

## Pull Requests

Please include:

- A concise summary of the change
- Any deployment or configuration impact
- The validation commands you ran
- Screenshots for visible UI changes

## Licensing

This project is licensed under the MIT License. By contributing, you agree that your contribution will be licensed under the same license.

## Code of Conduct

All contributors must follow `CODE_OF_CONDUCT.md`.

