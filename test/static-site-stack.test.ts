import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { StaticSiteStack } from "../lib/static-site-stack";

describe("StaticSiteStack", () => {
  test("creates a private encrypted S3 bucket", () => {
    const template = synthTemplate();

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test("retains site bucket by default", () => {
    const template = synthTemplate();

    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });
    template.resourceCountIs("Custom::S3AutoDeleteObjects", 0);
  });

  test("can opt into destroy cleanup for demo stacks", () => {
    const app = new App({
      context: {
        siteRemovalPolicy: "destroy",
      },
    });
    const stack = new StaticSiteStack(app, "DestroyStack");
    const template = Template.fromStack(stack);

    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Delete",
      UpdateReplacePolicy: "Delete",
    });
    template.resourceCountIs("Custom::S3AutoDeleteObjects", 1);
  });

  test("creates a CloudFront distribution with HTTPS redirect", () => {
    const template = synthTemplate();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        DefaultRootObject: "index.html",
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: "redirect-to-https",
        },
      },
    });
  });

  test("uses CSP frame ancestors instead of X-Frame-Options", () => {
    const template = synthTemplate();

    template.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
      ResponseHeadersPolicyConfig: {
        SecurityHeadersConfig: {
          ContentSecurityPolicy: {
            ContentSecurityPolicy: "default-src 'self' https://app.glean.com https://*.glean.com; script-src 'self' https://app.glean.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://app.glean.com https://*.glean.com; frame-src https://app.glean.com https://*.glean.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
          },
        },
      },
    });
  });

  test("deploys static site assets to the bucket", () => {
    const template = synthTemplate();

    template.resourceCountIs("Custom::CDKBucketDeployment", 1);
  });
});

function synthTemplate(): Template {
  const app = new App();
  const stack = new StaticSiteStack(app, "TestStack");
  return Template.fromStack(stack);
}
