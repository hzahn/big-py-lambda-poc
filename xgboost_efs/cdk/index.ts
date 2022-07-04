import {Duration} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Code, Runtime} from "aws-cdk-lib/aws-lambda";
import {BigFunction} from "./efs-asset";
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {AssetCode} from "aws-cdk-lib/aws-lambda/lib/code";
import {join} from "path";

export class BigLambdaEfs extends Construct {
    public lambda;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const dep = buildBigPythonDepAsset('xgboost')
        this.lambda = this.createLambda(dep)
    }

    private createLambda(dep: AssetCode) {
        const vpc = Vpc.fromLookup(this, "vpc", {isDefault: true});
        const functionName = 'XgBoostEfsLambda';
        return new BigFunction(this, functionName, {
            bigPyDep: dep,
            functionName: functionName,
            runtime: Runtime.PYTHON_3_9,
            memorySize: 128,
            vpc,
            timeout: Duration.minutes(10),
            deadLetterQueueEnabled: true,
            code: Code.fromAsset(`${__dirname}/../lambda`),
            handler: `main.handler`,
        });
    }
}

export function buildBigPythonDepAsset(depName: string) {
  const path = join(__dirname, '..', 'deps', depName);
  return buildPyAsset(path, false);
}

export function buildPyAsset(path: string, strip = true) {
  const stripCommand = strip ? `&& find /asset-output -name '*.so' -exec strip {} +` : '';
  return Code.fromAsset(path, {
    bundling: {
      image: Runtime.PYTHON_3_9.bundlingImage,
      command: ['bash', '-c', `pip install -r requirements.txt -t /asset-output && rm -rf /asset-output/botocore* /asset-output/future* ${stripCommand}`],
    },
  });
}