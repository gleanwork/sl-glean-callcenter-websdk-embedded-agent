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
