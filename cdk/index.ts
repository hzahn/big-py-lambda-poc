import {App} from "aws-cdk-lib";
import {BigLambdaPocStack} from "./big-lambda-poc-stack";

const lambdaFolder = process.env.LAMBDA || 'xgboost'
const app = new App();
new BigLambdaPocStack(app, `BigLambdaPocStack`, {lambdaFolder, env: {account: '998978876161', region: 'eu-central-1'}});