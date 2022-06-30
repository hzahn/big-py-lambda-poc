import {Duration, Stack, StackProps} from "aws-cdk-lib";
import {Construct} from 'constructs';
import {Parallel, StateMachine, Succeed} from "aws-cdk-lib/aws-stepfunctions";
import {LambdaInvoke} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {IFunction} from "aws-cdk-lib/aws-lambda";
import {CompositePrincipal, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {BigLambdaCustomImage} from "../xgboost_custom_image/cdk";
import {BigLambdaS3} from "../xgboost_s3/cdk";
import {BigLambdaEfs} from "../xgboost_efs/cdk";


export interface BigLambdaPocStackProps extends StackProps {
    lambdaFolder: string;
}

export class BigLambdaPocStack extends Stack {
    constructor(scope: Construct, id: string, private readonly props: BigLambdaPocStackProps) {
        super(scope, id, props);
        const lambdaCustomImage = new BigLambdaCustomImage(this, 'bigLambdaCustomImage');
        const lambdaS3 = new BigLambdaS3(this, 'bigLambdaS3');
        const lambdaEfs = new BigLambdaEfs(this, 'bigLambdaEfs');
        const lambdas = [
            lambdaCustomImage.lambda,
          //  lambdaS3.lambda,
          //  lambdaEfs.lambda,
        ];
        this.createStateMachine(`${props.lambdaFolder}StateMachine`, lambdas);
    }


    private createStateMachine(id: string, functions: IFunction[]) {
        const invokelambdasSteps = functions.map((f) => new LambdaInvoke(this, `invoke-${f.functionName}`, {
            lambdaFunction: f,
            timeout: Duration.minutes(10),
        }));


        const invokeAllLambdasStep = new Parallel(this, 'invokeAllRatings', {}).branch(...invokelambdasSteps);


        const success = new Succeed(this, `Success`);
        const leadRatingStateMachine = invokeAllLambdasStep.next(success);
        const leadRatingRole = new Role(this, 'stateMachineRole', {assumedBy: new CompositePrincipal(new ServicePrincipal('states.amazonaws.com'))});

        return new StateMachine(this, id, {
            definition: leadRatingStateMachine,
            stateMachineName: id,
            role: leadRatingRole,
            timeout: Duration.minutes(10),
            tracingEnabled: true,
        });
    }
}
