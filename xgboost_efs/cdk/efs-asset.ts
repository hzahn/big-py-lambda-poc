import { IVpc, SubnetSelection, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { CustomResource, Duration, RemovalPolicy, StackProps } from 'aws-cdk-lib';
import * as efs from 'aws-cdk-lib/aws-efs';
import { AccessPoint, AccessPointProps, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { AssetCode, Code, FileSystem, Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { join } from 'path';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { FunctionProps } from 'aws-cdk-lib/aws-lambda/lib/function';

const OWNER_GID = '1001';
const OWNER_UID = '1001';

export interface BigFunctionProps extends FunctionProps {
  bigPyDep: AssetCode;
  vpc: IVpc;
}

export class BigFunction extends Function {
  constructor(scope: Construct, id: string, props: BigFunctionProps) {
    if (props.filesystem) {
      throw Error('Big Function is not allowed to assign a filesystem');
    }
    const assetCodeLocation = props.bigPyDep.bind(scope).s3Location;
    const fileSystem = new efs.FileSystem(scope, 'Filesystem', {
      vpc: props.vpc,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      removalPolicy: RemovalPolicy.DESTROY,
      throughputMode: ThroughputMode.BURSTING,
    });

    const efsFolder = 'python';
    const envExtension = 'PYTHONPATH';

    const bigAsset = new EfsAsset(scope, `${id}Asset`, {
      asset: props.bigPyDep,
      vpc: props.vpc,
      crFunctionName: `${props.functionName}EfsCr`,
      vpcSubnets: props.vpcSubnets,
      accessPointProps: {
        path: '/data',
        fileSystem,
        createAcl: {
          ownerGid: OWNER_GID,
          ownerUid: OWNER_UID,
          permissions: '0755', // rwxr-xr-x
        },
        posixUser: {
          uid: OWNER_UID,
          gid: OWNER_GID,
        },
      },
      s3SyncProps: [
        {
          targetDirPath: efsFolder,
          bucketName: assetCodeLocation?.bucketName ?? '',
          zipFilePath: assetCodeLocation?.objectKey ?? '',
        },
      ],
    });
    const funcProps = { ...props, filesystem: FileSystem.fromEfsAccessPoint(bigAsset.accessPoint, bigAsset.mountPath) };
    super(scope, id, funcProps);

    this.addEnvironment('JOBLIB_MULTIPROCESSING', '0');
    this.addEnvironment(envExtension, `${join('/opt', efsFolder)}:${join(bigAsset.mountPath, efsFolder)}`);
  }
}

export interface S3SyncProps {
  readonly bucketName: string;
  readonly zipFilePath: string;
  readonly targetDirPath?: string;
}

export interface EfsStackProps extends StackProps {
  readonly asset: AssetCode;
  readonly crFunctionName: string;
  readonly s3SyncProps: S3SyncProps[];
  readonly timeout?: Duration;
  readonly vpc: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  readonly accessPointProps: AccessPointProps;
}

export class EfsAsset extends Construct {
  readonly mountPath = '/mnt/opt';
  readonly accessPoint: AccessPoint;

  constructor(scope: Construct, id: string, props: EfsStackProps) {
    super(scope, id);
    this.accessPoint = new AccessPoint(scope, `EFS-access`, props.accessPointProps);
    const handler = this._createHandler(this.accessPoint, props);
    const crProvider = new Provider(this, 'CrProvider', {
      onEventHandler: handler,
    });

    new CustomResource(this, 'SyncTrigger', {
      serviceToken: crProvider.serviceToken,
      properties: {
        S3_SYNCS: props.s3SyncProps.map((s) => `${s.bucketName}:${s.zipFilePath}:${s.targetDirPath ?? ''}`).join(';'),
        MOUNT_TARGET: this.mountPath,
        VERSION: '1',
      },
    });

    handler.node.addDependency(props.accessPointProps.fileSystem.mountTargetsAvailable);
  }

  private _createHandler(accessPoint: AccessPoint, props: EfsStackProps): IFunction {
    const vpcSubnets = props.vpcSubnets ?? { subnetType: SubnetType.PRIVATE_WITH_NAT };
    const timeout = props.timeout ?? Duration.minutes(15);

    return new Function(this, 'S3ToEfsAssetSync', {
      functionName: props.crFunctionName,
      runtime: Runtime.PYTHON_3_8,
      code: Code.fromAsset(path.join(__dirname, '../cr', 's3ToEfsSyncCr')),
      handler: 'main.handler',
      filesystem: FileSystem.fromEfsAccessPoint(accessPoint, this.mountPath),
      vpcSubnets: vpcSubnets,
      vpc: props.vpc,
      memorySize: 512,
      timeout: timeout,
      environment: {
        S3_SYNCS: props.s3SyncProps.map((s) => `${s.bucketName}:${s.zipFilePath}:${s.targetDirPath ?? ''}`).join(';'),
        MOUNT_TARGET: this.mountPath,
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ['s3:GetObject*'],
          resources: props.s3SyncProps.map((s) => `arn:aws:s3:::${s.bucketName}/${s.zipFilePath}`),
        }),
      ],
    });
  }
}
