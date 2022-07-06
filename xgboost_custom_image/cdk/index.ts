import {Duration} from "aws-cdk-lib";
import {Construct} from "constructs";
import {Architecture, Code, DockerImageCode, DockerImageFunction, ILayerVersion, Function} from "aws-cdk-lib/aws-lambda";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {DockerImageFunctionProps} from "aws-cdk-lib/aws-lambda/lib/image-function";


export class BigLambdaCustomImage extends Construct {
    public lambda;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        //this.lambda = this.createLambda(scope)
        this.lambda = new BigLambdaCustomImagev2(scope, 'bigPythonLambdaCustomImagev2', {
            functionName: 'xgboostCustomImageLambdav2',
            functionCode: Code.fromAsset(`${__dirname}/../lambda`),
            code: DockerImageCode.fromImageAsset(`${__dirname}/..`, {
                file: `image/Dockerfile`
            }),
            environment: { stage: 'my' },
            memorySize: 128,
            architecture: Architecture.ARM_64,
            timeout: Duration.minutes(10),
        })
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

interface BigLambdaCustomImagev2Props extends DockerImageFunctionProps {
    functionCode: Code;
    layers?: ILayerVersion[];
}

export class BigLambdaCustomImagev2 extends DockerImageFunction {
    constructor(scope: Construct, id: string, props: BigLambdaCustomImagev2Props) {
        const assetCodeLocation = props.functionCode.bind(scope).s3Location;
        const layerArns = props.layers ? props.layers.map( l => l.layerVersionArn ).join(';') : '';

        const environment = {
            ...props.environment,
              CODE_BUCKET: assetCodeLocation?.bucketName ?? '',
              CODE_KEY: assetCodeLocation?.objectKey ?? '',
              CODE_ENTRY_POINT: 'main.handler',
              LAYER_ARNS: layerArns,
            }

        const props_changed: DockerImageFunctionProps = {
                ...props,
                environment,
            }


        super(scope, id, props_changed);
        Bucket.fromBucketName(scope, 'cdk-bucket-ci', assetCodeLocation?.bucketName ?? '').grantRead(this);
    }
}