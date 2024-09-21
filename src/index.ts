#!/usr/bin/env node

import { CfnInclude } from "@aws-cdk/cloudformation-include";
import * as cdk from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import { parse } from "ts-command-line-args";

interface Options {
  template : string;
  newBasePath ?: string;
}

export const args = parse<Options>({
  template: {
    type: String,
    alias: "t",
    description: "Path to generated (by aws-cdk) Cloudformation's template file",
  },
  newBasePath: {
    type: String,
    alias: "b",
    optional: true,
    description: "New base path - will be used to prepend resources location from template",
  },
});

const LAMBDA_RESOURCE_TYPE = "AWS::Lambda::Function";
const METADATA_ASSET_PATH = "aws:asset:path";

const isWindows = process.platform === 'win32';
if (!isWindows) {
  // Oh, not Windows98 --> do big nothing, return content as is
  console.log(
    fs.readFileSync(args.template, {
      encoding: "utf8"
    })
  );
} else {
  if (args.newBasePath === undefined) {
    const dir = path.dirname(path.resolve(args.template));
    args.newBasePath = `/mnt/${dir[0].toLowerCase()}${dir.slice(2).replace(/\\/g, '/')}`;
  }
  console.log(transformTemplate(args.template, args.newBasePath));
}

function transformTemplate(templatePath: string, newBasePath: string) : string {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "LoadTemplateStack");
  const template = new CfnInclude(stack, "ExistingTemplate", {
    templateFile: templatePath
  });

  const resources = (template as unknown as { resources: Record<string, cdk.CfnElement> }).resources;
  if (typeof resources === "object") {
    Object.keys(resources).map((ri) => template.getResource(ri))
      .filter((r) => r.cfnResourceType === LAMBDA_RESOURCE_TYPE)
      .forEach((r) => {
        let assetPath = r.getMetadata(METADATA_ASSET_PATH);
        assetPath = path.join(newBasePath, assetPath);
        r.addMetadata(METADATA_ASSET_PATH, assetPath);
      });
  }

  return JSON.stringify(app.synth().getStackByName(stack.stackName).template, null, 1);
}
