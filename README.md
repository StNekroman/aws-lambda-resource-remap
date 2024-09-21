# aws-lambda-resource-remap
Magic tool, which generates new Cloudformation file from given one, but changing code location for lambdas. Allowing them to run via SAM CLI with Docker in WSL from Windows host.

### Only for Windows + Docker in WSL users!

Not one of them? - Stop reading immediately.

## Why?

Amazon (book-selling company) has their [official manual](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-docker.html) how to setup SAM CLI with Docker, which is required to invoke/run/debug lambdas locally.  
But they stuck in past and still suggest to use Docker Desktop on Windows, which is unacceptable due it's virus license.  
So everybody (win users, of course) moved docker to WSL.  
So AWS manual doesn't cover Win+WSL docker installation at all.  
Even and when install docker in WSL, [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html),  
anyway you will hit the error:
```cmd
2024-09-20T21:04:17.669Z        undefined       ERROR   Uncaught Exception      {"errorType":"Runtime.ImportModuleError","errorMessage":"Error: Cannot find module 'index'\nRequire stack:\n- /var/runtime/index.mjs","stack":["Runtime.ImportModuleError: Error: Cannot find module 'index'","Require stack:","- /var/runtime/index.mjs","    at _loadUserApp (file:///var/runtime/index.mjs:1087:17)","    at async UserFunction.js.module.exports.load (file:///var/runtime/index.mjs:1119:21)","    at async start (file:///var/runtime/index.mjs:1282:23)","    at async file:///var/runtime/index.mjs:1288:1"]}
20 Sep 2024 21:04:17,682 [ERROR] (rapid) Init failed error=Runtime exited with error: exit status 129 InvokeID=
20 Sep 2024 21:04:17,682 [ERROR] (rapid) Invoke failed error=Runtime exited with error: exit status 129 InvokeID=b9086e3d-59d7-4904-b8bc-77e7d74e6d44
20 Sep 2024 21:04:17,682 [ERROR] (rapid) Invoke DONE failed: Sandbox.Failure
```

## What happens?

SAM CLI starts a Docker container with required environment, with AWS bonuses.  
Mounts directory to it as `/var/task`, directory usually is that one, which contains your CDK-generated Cloudformation stack template json, e.g. `cdk.out`.  
So later, inside Docker, AWS ~~framework~~ python code tries to find and load required (for lambda) code.  
That python code for some magic reason uses CWD (current working dir) as base path and always resolves code location from that.  
And everything works fine, while you run docker on the same machine.  
But WSL - different thing, it's virtual machine actually.  
So python code tries to load something on absolute path, but that path was built on Win environment. (including disk labels - "D:")  
Thus nothing works.  
You may think that magic `--docker-volume-basedir` from [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html) will resolve that.  
So theoretically you could pass `/mnt/d/dir`, WSL-style path to dir, which is already mounted.  
But ~~yes~~ no, because AWS python code does [dirty magic](https://github.com/aws/aws-sam-cli/blob/537f3cefed2c8999c6bd6cebffac72666d811534/samcli/lib/utils/codeuri.py#L38) around absolutification of the path.  
So you can pass there anything (`/mnt/d/dir`), but that line will transform your anything to win-env based abs path, which will start from disk latter, again.  
I don't think that this book-selling company will change that code anywhere soon. They have unit tests on that to ensure "absolutification", so they need it for some reason.  

## So what?

That's why this small npx tool was born.  
Main idea of it - take CDK-generated Cloudformation template json, modify lambda locations, dump new content and save it separately.  
So later, new separate modified template file can be used to run local SAM things (`sam local invoke`, `sam local start-api`)

### Prerequisites

Add this tool to your `devDependencies`:  

```json
"@stnekroman/aws-lambda-resource-remap": "^1.0.4"
```
This tool relies on some dependencies (but doesn't include them inside), which are mandatory:  

```json
"@aws-cdk/cloudformation-include": "^1.204.0",
"@aws-cdk/core": "^1.204.0"
```
install dependencies and now you can create custom step (or modify existing to add post-action):  

```json
"scripts": {
  "build": "tsc & aws-lambda-resource-remap -t \"./cdk.out/<StackFilename>.template.json\" > ./cdk.out/local.template.json",
},
```

in this example, npx tool `aws-lambda-resource-remap` takes pre-generated (by `sam synth`) Cloudformation's file (usually located under `cdk.out` dir, ends with `*.template.json`)  
modifies all lambdes code locations and flushes new resulting template to console.  So `>` operator redirects output to new file, named `local.template.json`  
As result - you have new, patched (for local execution) file, which you can use in:  

```cmd
sam local invoke --profile dev --no-event -t ./cdk.out/local.template.json <Name of your lambda function>
```

Tool `aws-lambda-resource-remap` accepts two arguments:  
`--template` (or just `-t`) -- path, where to take template  
`--newBasePath` (or just `-b`) -- prefix which to prepend to all lambda source locations.  

If `--newBasePath` specified - then fixed & predefined prefix will be used.  
If `--newBasePath` not specified - then it will be auto-calcualted depending on `--template` argument.  

## Installing Docker in WSL

Read and do by manual:  
https://medium.com/@rom.bruyere/docker-and-wsl2-without-docker-desktop-f529d15d9398  
But except "Install Docker CLI on Windows"  
Instead of suggested there "docker.exe/dockerd.exe" just create `docker.bat` file with content:

```bat
@echo off
wsl docker %*
```

and add owning dir to PATH env variable.  

---
License: MIT, good luck