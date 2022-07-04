import {Duration, Size} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import {Bucket} from "aws-cdk-lib/aws-s3";

export class BigLambdaS3 extends Construct {
    public lambda;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.lambda = this.createLambda()
    }

    private createLambda() {
        const asset = buildDepAsset('xgboost')
        const assetCodeLocation = asset.bind(this).s3Location;

        const functionName = 'XgBoostS3Lambda';
        const lambda =  new Function(this, functionName, {
            functionName: functionName,
            runtime: Runtime.PYTHON_3_8,
            memorySize: 128,
            timeout: Duration.minutes(10),
            deadLetterQueueEnabled: true,
            code: Code.fromAsset(`${__dirname}/../lambda`),
            ephemeralStorageSize: Size.gibibytes(1),
            environment: {
                'DEP_BUCKET': assetCodeLocation?.bucketName ?? '',
                'DEP_KEY': assetCodeLocation?.objectKey ?? '',
            },
            handler: `main.handler`,
        });
        Bucket.fromBucketName(this, 'cdk-bucket-s3', assetCodeLocation?.bucketName ?? '').grantRead(lambda);
        return lambda

    }

}

function buildDepAsset(folder: string) {
    return Code.fromAsset(`${__dirname}/../layer/${folder}`, {
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