#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StaticSiteStack } from "../lib/static-site-stack";

const app = new cdk.App();

new StaticSiteStack(app, "GleanCallCenterEmbeddedAgentSite", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
