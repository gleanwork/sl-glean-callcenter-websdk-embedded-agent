# Agent Guide

This repository contains a static call center demo that embeds a Glean Agent with the Glean Web SDK and deploys to AWS with CDK.

## Purpose

Use this repo as a reference implementation for standalone embedded-agent sites. It should remain public-safe, easy to clone, and deployable without adding secrets to source control.

## Architecture

```text
Browser
  -> CloudFront distribution
  -> private S3 bucket with Origin Access Control
  -> static files in site/

Browser
  -> Glean Web SDK script from app.glean.com
  -> customer's Glean deployment at runtime
```

## File Map

- `site/index.html`: static app shell and Glean Web SDK script tag
- `site/app.js`: Glean Web SDK initialization, runtime configuration, and prompt/context handoff
- `site/styles.css`: responsive workspace styling
- `lib/static-site-stack.ts`: CDK stack for S3, CloudFront, optional DNS, and deployment
- `bin/sl-glean-callcenter-websdk-embedded-agent.ts`: CDK app entrypoint
- `scripts/check-static-site.mjs`: static validation
- `test/static-site-stack.test.ts`: CDK infrastructure assertions
- `README.md`: human-facing setup and deployment docs
- `SECURITY.md`: vulnerability reporting and secret-handling guidance

## Safe Editing Rules

- Never commit API keys, OAuth secrets, AWS credentials, Glean API tokens, or customer data.
- Never hardcode customer-specific Glean Agent IDs, backend URLs, or web app URLs as defaults.
- Keep customer-specific Glean configuration runtime-only through URL parameters, local storage, or a customer's own deployment wrapper.
- If changing Content Security Policy, update both `site/index.html` and `lib/static-site-stack.ts`.
- Keep the default deployment usable without a custom domain.
- Keep the default CDK removal policy production-safe. The site bucket should be retained unless a user explicitly asks for disposable demo cleanup.
- Keep `Glean Agent` as the top-right button label in all open and closed states; use `aria-expanded` for state.

## Local Validation

Run these before proposing or committing changes:

```bash
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

Open `http://localhost:8080`.

## Default AWS Deployment

The default deployment does not require a custom domain:

```bash
npm install
npm run check
npm run build
npm run cdk:synth
npm run cdk:deploy
```

Use the `CloudFrontUrl` stack output to open the deployed site.

By default, the CDK stack retains the S3 bucket on destroy. For disposable demo stacks only, users may opt into cleanup:

```bash
npm run cdk:deploy -- -c siteRemovalPolicy=destroy
```

## Custom Domain Deployment Questions

Before deploying with a custom domain, ask the user:

1. Which AWS account and region should be used?
2. What domain should serve the site, for example `support-ai.example.com`?
3. Is DNS for the parent zone managed in Route53?
4. If Route53-managed, what are the hosted zone ID and hosted zone name?
5. Is there already an ACM certificate in `us-east-1` for the domain?
6. If yes, what is the ACM certificate ARN?

CloudFront requires ACM certificates in `us-east-1`.

## Custom Domain Commands

Route53-managed DNS:

```bash
npm run cdk:deploy -- \
  -c domainName=support-ai.example.com \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  -c hostedZoneId=Z1234567890ABC \
  -c hostedZoneName=example.com
```

Externally managed DNS:

```bash
npm run cdk:deploy -- \
  -c domainName=support-ai.example.com \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123
```

For externally managed DNS, create the CNAME/ALIAS record manually after deployment.

## Embedding in Another Portal

If the deployed site needs to be embedded in another portal, ask for the exact portal origin and pass it as a comma-separated context value:

```bash
npm run cdk:deploy -- -c frameAncestors=https://solutions.example.com
```

Keep `frameAncestors` as narrow as possible. Do not use `*`.

## Public-Readiness Checklist

Before making the repository public or pushing release-ready changes:

- `git diff` contains no secrets or customer-specific IDs.
- `README.md` and `AGENTS.md` accurately describe deployment.
- `npm run check`, `npm run audit`, `npm run build`, `npm test`, and `npm run cdk:synth` pass.
- The GitHub remote is `gleanwork/sl-glean-callcenter-websdk-embedded-agent`.
- Repository visibility changes are confirmed with the user before execution.
