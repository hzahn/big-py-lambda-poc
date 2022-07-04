import {Duration, Stack} from "aws-cdk-lib";
import {Construct} from "constructs";
import {BigLambdaPocStackProps} from "../../cdk/big-lambda-poc-stack";
import {
    Code,
    DockerImageFunction,
    Function,
    Handler,
    Runtime,
    DockerImageCode,
    Architecture
} from "aws-cdk-lib/aws-lambda";
import {Bucket} from "aws-cdk-lib/aws-s3";


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
        const lambda =  new DockerImageFunction(this, functionName, {
            functionName,
            code: DockerImageCode.fromImageAsset(`${__dirname}/..`, {
                file: `image/Dockerfile`
            }),
            memorySize: 128,
            architecture: Architecture.ARM_64,
            timeout: Duration.minutes(10),
            environment: {
              CODE_BUCKET: assetCodeLocation?.bucketName ?? '',
              CODE_KEY: assetCodeLocation?.objectKey ?? '',
              CODE_ENTRY_POINT: 'main.handler',
          },
        })
        Bucket.fromBucketName(scope, 'cdk-bucket-ci', assetCodeLocation?.bucketName ?? '').grantRead(lambda);
        return lambda

    }
}