# Security Policy

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

If you believe you found a vulnerability in this example, contact Glean Support at `support@glean.com` and include:

- A description of the issue
- Steps to reproduce
- Any affected deployment configuration
- Whether any credentials or customer data may have been exposed

## Secret Handling

This repository must remain public-safe.

Do not commit:

- Glean API keys or auth tokens
- OAuth client secrets
- AWS access keys or session tokens
- Customer-specific Agent IDs or backend URLs
- Private customer data or transcripts

Use runtime configuration, AWS Secrets Manager, environment variables outside source control, or a customer's own backend for deployment-specific values.

## Dependency Auditing

This is a static website with no server-side runtime package dependencies. The CDK and test packages are development and deployment tooling.

Run the runtime dependency audit with:

```bash
npm run audit
```

You may see advisories from bundled CDK development tooling if you run plain `npm audit`. Treat those separately from runtime site dependencies and update CDK packages when upstream fixes are available.
