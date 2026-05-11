# Call Center Embedded Agent with the Glean Web SDK

This repository is a production-ready, customer-facing example that shows how to embed a Glean Agent into a call center support workflow using the Glean Web SDK.

The sample is intentionally static: no application backend, no API keys, and no customer-specific Glean configuration committed to source. It can be deployed as-is to AWS with CDK, then configured at runtime through URL parameters or the in-page settings dialog.

## What the Example Shows

- A realistic support workspace with customer details, case context, and a live transcript
- Glean Chat embedded with `window.GleanWebSDK.renderChat(...)`
- A "Send transcript to AI" action that turns in-app context into an `initialMessage`
- Quick action buttons that open the embedded assistant with focused prompts
- A toggleable Glean Agent pane that lets the application reclaim space when chat is closed
- Runtime configuration for `webAppUrl`, `backend`, and `agentId`
- AWS CDK deployment to CloudFront backed by a private S3 bucket

## Repository Layout

```text
.
├── site/                         # Static website served by CloudFront
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── bin/                          # CDK app entrypoint
├── lib/                          # CDK stack
├── scripts/                      # Validation utilities
├── test/                         # CDK assertions
├── AGENTS.md                     # Agent-facing repo and deploy guide
├── README.md
├── cdk.json
└── package.json
```

## Prerequisites

- Node.js 20 or newer
- npm
- AWS CLI configured with credentials for the target AWS account
- AWS CDK bootstrap completed in the target account and region

Bootstrap example:

```bash
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start a local static preview:

```bash
npm start
```

Then open:

```text
http://localhost:8080
```

## Configure the Embedded Agent

Use the gear icon in the page header or Agent pane, or pass values through URL parameters:

```text
http://localhost:8080/?webAppUrl=https%3A%2F%2Fapp.glean.com&backend=https%3A%2F%2Fyour-company-be.glean.com%2F&agentId=YOUR_AGENT_ID
```

Configuration values:

- `webAppUrl`: The web page where users access Glean, such as `https://app.glean.com` or a company-specific Glean web app URL.
- `backend`: The Glean backend URL, such as `https://your-company-be.glean.com/`. Supplying this is recommended because it routes users to the correct Glean deployment.
- `agentId`: Optional. When provided, chat uses the specified Glean Agent. When omitted, chat opens the default Glean Assistant experience.

These values are stored in `localStorage` after you apply them. Do not commit customer-specific values to this repository.

## Authentication Model

This sample uses the default Glean SSO flow. If the user is not already signed in to Glean, the embedded widget prompts them to sign in.

For public sites, customer portals, or guest experiences where users should not sign in with Glean SSO, use token-based authentication instead. The Glean Web SDK supports `authMethod: "token"`, `authToken`, and `onAuthTokenRequired`; your backend should create short-lived tokens and never expose Glean API keys in browser code.

Official docs:

- [Glean Chat Web SDK](https://developers.glean.com/libraries/web-sdk/components/chat)
- [Server-to-server authentication](https://developers.glean.com/libraries/web-sdk/authentication/server-to-server)
- [ChatOptions reference](https://app.glean.com/meta/browser_api/interfaces/ChatOptions.html)

## Validate

Run all local checks:

```bash
npm run check
npm run audit
npm run build
npm test
npm run cdk:synth
```

## Deploy with CDK

Deploy to the default CloudFront domain:

```bash
npm run cdk:deploy
```

The deployment outputs:

- `CloudFrontUrl`: the default deployed site URL
- `SiteBucketName`: the private S3 bucket that stores static assets
- `CustomDomainUrl`: only when a custom domain is configured

Destroy the stack:

```bash
npm run cdk:destroy
```

By default, the S3 bucket is retained when the stack is destroyed. This is safer for production deployments because it prevents accidental asset deletion. For short-lived demo stacks where cleanup is desired, deploy with:

```bash
npm run cdk:deploy -- -c siteRemovalPolicy=destroy
```

Only use `siteRemovalPolicy=destroy` for disposable environments.

## Custom Domain Deployment

The default deployment works without a custom domain. For customer-owned domains, collect these values before deploying:

- Target domain name, for example `support-ai.example.com`
- Whether DNS is hosted in Route53
- If Route53-managed: hosted zone ID and hosted zone name
- ACM certificate ARN for the target domain

Important: CloudFront requires the ACM certificate to be in `us-east-1`.

Deploy with a custom domain and Route53-managed DNS:

```bash
npm run cdk:deploy -- \
  -c domainName=support-ai.example.com \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  -c hostedZoneId=Z1234567890ABC \
  -c hostedZoneName=example.com
```

Deploy with a custom domain but externally managed DNS:

```bash
npm run cdk:deploy -- \
  -c domainName=support-ai.example.com \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123
```

After deploy, create the required DNS record with your DNS provider pointing the custom domain to the CloudFront distribution domain output by CDK.

## Embedding in Another Portal

The default CloudFront security headers allow the site to frame itself only. If you need to embed the deployed site in another portal, pass a comma-separated list of allowed frame ancestors:

```bash
npm run cdk:deploy -- -c frameAncestors=https://solutions.example.com
```

Keep this list as narrow as possible.

## How Context Is Sent to the Agent

The important pattern is in `site/app.js`:

```js
sdk.renderChat(elements.chat, buildChatOptions(latestConfig, initialMessage));
```

When a support rep clicks "Send transcript to AI", the sample builds a prompt from the visible case context and transcript, then renders chat with that prompt as `initialMessage`. In a production application, you can build the same message from selected records, form state, CRM objects, or any other context the user is already working with.

## Security Notes

- Do not hardcode private Agent IDs, backend URLs, API keys, AWS account IDs, or customer data in source.
- Keep server-to-server token creation on your backend. Browser code should only receive short-lived auth tokens.
- The CDK stack deploys a private S3 bucket and serves the site through CloudFront Origin Access Control.
- The CDK stack retains the S3 bucket by default on destroy. Use `-c siteRemovalPolicy=destroy` only for disposable demo environments.
- Update the Content Security Policy in `site/index.html` and `lib/static-site-stack.ts` if your Glean deployment, asset host, or app domain differs from the default sample.
- Treat `initialMessage` as user-visible prompt content. Avoid sending sensitive context unless your application has already authorized the current user to access it.
- Report security issues privately. See `SECURITY.md`.

## For Coding Agents

Read `AGENTS.md` before editing or deploying this repository. It includes the architecture, safe-edit constraints, validation commands, and deployment questions agents should ask before custom-domain deployment.

## License

MIT
