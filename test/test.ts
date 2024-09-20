import { describe, expect, test } from "@jest/globals";
import { execSync } from 'child_process';
import * as fs from "fs";
import * as path from "path";

describe("Arrays", () => {

  const cliPath = path.resolve(__dirname, '../dist/index.js');

  test("transparent transform without change ", () => {
    const output = execSync(`node ${cliPath} -t "./test/resources/AwsTestLambdasStack.template.json" -b ""`, { encoding: 'utf-8' });
    const actual = JSON.parse(output);
    const expected = JSON.parse(fs.readFileSync("./test/resources/AwsTestLambdasStack.template.json", {
      encoding: "utf8"
    }));
    expect(actual).toEqual(expected);    
  });

  test("touches only lambdas ", () => {
    const output = execSync(`node ${cliPath} -t "./test/resources/AwsTestLambdasStack.template.json" -b "/prefix"`, { encoding: 'utf-8' });
    const actual = JSON.parse(output);
    const expected = JSON.parse(fs.readFileSync("./test/resources/AwsTestLambdasStack.template.json", {
      encoding: "utf8"
    }));
    expected.Resources.HelloWorldFunctionB2AB6E79.Metadata["aws:asset:path"] = path.join("/prefix", expected.Resources.HelloWorldFunctionB2AB6E79.Metadata["aws:asset:path"]);
    expect(actual).toEqual(expected);    
  });
});