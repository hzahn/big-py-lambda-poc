import {Duration} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Code, Runtime} from "aws-cdk-lib/aws-lambda";
import {BigFunction} from "./efs-asset";
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {AssetCode} from "aws-cdk-lib/aws-lambda/lib/code";

export class BigLambdaEfs extends Construct {
    public lambda;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const dep = buildDepAsset('xgboost')
        this.lambda = this.createLambda(dep)
    }

    private createLambda(dep: AssetCode) {
        const vpc = Vpc.fromLookup(this, "vpc", {isDefault: true});
        const functionName = 'XgBoostEfsLambda';
        return new BigFunction(this, functionName, {
            bigPyDep: dep,
            functionName: functionName,
            runtime: Runtime.PYTHON_3_8,
            memorySize: 128,
            vpc,
            timeout: Duration.minutes(10),
            deadLetterQueueEnabled: true,
            code: Code.fromAsset(`${__dirname}/../lambda`),
            handler: `main.handler`,
        });
    }
}

function buildDepAsset(folder: string): AssetCode {
    return Code.fromAsset(`${__dirname}/../deps/${folder}`, {
        bundling: {
            image: Runtime.PYTHON_3_8.bundlingImage,
            user: 'root',
            command: [
                'bash',
                '-c',
                `pip install -r requirements.txt -t /asset-output/python && find /asset-output/python -name '*.so' -exec strip {} +`,
            ],
        },
    });
}