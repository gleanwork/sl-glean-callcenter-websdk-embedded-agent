import * as path from "path";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

interface CustomDomainConfig {
  readonly certificateArn?: string;
  readonly domainName?: string;
  readonly hostedZoneId?: string;
  readonly hostedZoneName?: string;
}

export class StaticSiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const customDomain = this.getCustomDomainConfig();
    const domainNames = customDomain.domainName ? [customDomain.domainName] : undefined;
    const certificate = customDomain.certificateArn
      ? acm.Certificate.fromCertificateArn(this, "ImportedCertificate", customDomain.certificateArn)
      : undefined;

    if (customDomain.domainName && !certificate) {
      throw new Error(
        "A custom domain deployment requires an ACM certificate ARN in us-east-1. Pass it with -c certificateArn=...",
      );
    }

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, "SecurityHeadersPolicy", {
      comment: "Security headers for the Glean embedded agent static site",
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self' https://app.glean.com https://*.glean.com; " +
            "script-src 'self' https://app.glean.com; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https://app.glean.com https://*.glean.com; " +
            "frame-src https://app.glean.com https://*.glean.com; " +
            "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          override: true,
          preload: true,
        },
        xssProtection: {
          modeBlock: true,
          protection: true,
          override: true,
        },
      },
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      certificate,
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        responseHeadersPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      domainNames,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    new s3deploy.BucketDeployment(this, "DeploySite", {
      cacheControl: [
        s3deploy.CacheControl.noCache(),
        s3deploy.CacheControl.mustRevalidate(),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      sources: [s3deploy.Source.asset(path.join(__dirname, "..", "site"))],
    });

    this.addDnsRecordIfConfigured(customDomain, distribution);

    new CfnOutput(this, "CloudFrontUrl", {
      description: "CloudFront URL for the deployed static site",
      value: `https://${distribution.distributionDomainName}`,
    });

    new CfnOutput(this, "SiteBucketName", {
      description: "Private S3 bucket storing site assets",
      value: siteBucket.bucketName,
    });

    if (customDomain.domainName) {
      new CfnOutput(this, "CustomDomainUrl", {
        description: "Custom domain URL for the deployed static site",
        value: `https://${customDomain.domainName}`,
      });
    }
  }

  private getCustomDomainConfig(): CustomDomainConfig {
    return {
      certificateArn: this.node.tryGetContext("certificateArn"),
      domainName: this.node.tryGetContext("domainName"),
      hostedZoneId: this.node.tryGetContext("hostedZoneId"),
      hostedZoneName: this.node.tryGetContext("hostedZoneName"),
    };
  }

  private addDnsRecordIfConfigured(
    customDomain: CustomDomainConfig,
    distribution: cloudfront.Distribution,
  ): void {
    if (!customDomain.domainName || !customDomain.hostedZoneId || !customDomain.hostedZoneName) {
      return;
    }

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: customDomain.hostedZoneId,
      zoneName: customDomain.hostedZoneName,
    });

    new route53.ARecord(this, "AliasRecord", {
      recordName: customDomain.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone,
    });

    new route53.AaaaRecord(this, "AliasIpv6Record", {
      recordName: customDomain.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone,
    });
  }
}
