#!/usr/bin/env node

import { CfnInclude } from "@aws-cdk/cloudformation-include";
import * as cdk from "@aws-cdk/core";
import { Objects } from "@stnekroman/tstools";
import * as path from "path";
import { parse } from "ts-command-line-args";

const LAMBDA_RESOURCE_TYPE = "AWS::Lambda::Function";
const METADATA_ASSET_PATH = "aws:asset:path";

export const args = parse({
  template: {
    type: String,
    alias: "t",
    description: "Path to generated (by aws-cdk) Cloudformation's template file",
  },
  newBasePath: {
    type: String,
    alias: "b",
    description: "New base path - will be used to prepend resources location from template",
  },
});

const app = new cdk.App();
const stack = new cdk.Stack(app, "LoadTemplateStack");
const template = new CfnInclude(stack, "ExistingTemplate", {
  templateFile: args.template,
});

const resources = (template as unknown as { resources: Record<string, cdk.CfnElement> }).resources;
if (Objects.isNotNullOrUndefined(resources)) {
  Object.keys(resources).map((ri) => template.getResource(ri))
    .filter((r) => r.cfnResourceType === LAMBDA_RESOURCE_TYPE)
    .forEach((r) => {
      let assetPath = r.getMetadata(METADATA_ASSET_PATH);
      assetPath = path.join(args.newBasePath, assetPath);
      r.addMetadata(METADATA_ASSET_PATH, assetPath);
    });
}

console.log(JSON.stringify(app.synth().getStackByName(stack.stackName).template, null, 1));
