import {Duration, Stack} from "aws-cdk-lib";
import {Construct} from "constructs";
import {BigLambdaPocStackProps} from "../../cdk/big-lambda-poc-stack";
import {Code, DockerImageFunction, Function, Handler, Runtime, DockerImageCode} from "aws-cdk-lib/aws-lambda";


export class BigLambdaCustomImage extends Construct {
    public lambda;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.lambda = this.createLambda(scope)
    }

    private createLambda(scope: Construct) {
        const codeAsset = Code.fromAsset(`${__dirname}/../lambda`);
        const assetCodeLocation = codeAsset.bind(scope).s3Location;
        const functionName = 'xgboostCustomImageLambda';
        return new DockerImageFunction(this, functionName, {
            code: DockerImageCode.fromImageAsset(`${__dirname}/..`, {
                cmd: ['main.handler'],
                file: `image/Dockerfile`
            }),
            memorySize: 128,
            timeout: Duration.minutes(10),
            environment: {
              CODE_BUCKET: assetCodeLocation?.bucketName ?? '',
              CODE_KEY: assetCodeLocation?.objectKey ?? '',
              CODE_ENTRY_POINT: 'main.handler',
          },
        })
       /* return new Function(this, functionName, {
          functionName: functionName,
          runtime: Runtime.FROM_IMAGE,
          memorySize: 128,
          timeout: Duration.minutes(10),
          deadLetterQueueEnabled: true,
          environment: {
              CODE_BUCKET: assetCodeLocation?.bucketName ?? '',
              CODE_KEY: assetCodeLocation?.objectKey ?? '',
              CODE_ENTRY_POINT: 'main.handler',
          },

          code: Code.fromAssetImage(`${__dirname}/..`, {
            cmd: ['main.handler'],
            file: `image/Dockerfile`
          }),
         handler: Handler.FROM_IMAGE,
        });
        */

    }
}