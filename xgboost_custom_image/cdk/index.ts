import {Duration, Stack} from "aws-cdk-lib";
import {Construct} from "constructs";
import {BigLambdaPocStackProps} from "../../cdk/big-lambda-poc-stack";
import {Code, Function, Handler, Runtime} from "aws-cdk-lib/aws-lambda";

export class BigLambdaCustomImage extends Construct {
    public lambda;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.lambda = this.createLambda()
    }

    private createLambda() {
        const functionName = 'xgboostCustomImageLambda';
        return new Function(this, functionName, {
          functionName: functionName,
          runtime: Runtime.FROM_IMAGE,
          memorySize: 128,
          timeout: Duration.minutes(10),
          deadLetterQueueEnabled: true,
          code: Code.fromAssetImage(`${__dirname}/..`, {
            cmd: ['main.handler'],
            file: `image/Dockerfile`
          }),
         handler: Handler.FROM_IMAGE,
        });
    }
}