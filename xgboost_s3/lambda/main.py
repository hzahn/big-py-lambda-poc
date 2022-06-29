import time
import os
import sys
start = time.time()
import boto3
bucket = os.environ.get('DEP_BUCKET')
key = os.environ.get('DEP_KEY')
if bool(os.environ.get('UNZIP_REQ', 'True')):
    try:
        import zipfile
        print(os.listdir('/opt/python'))
        with zipfile.ZipFile('/opt/python/layer.zip', 'r') as zip_ref:
            zip_ref.extractall('/tmp')
        print(os.listdir('/tmp/python'))
        sys.path.insert(0, '/opt/python')
    except ImportError:
        pass
        os.environ['UNZIP_REQ'] = 'False'

import xgboost


def get_bytes(bucket, key):
    s3_resource = boto3.resource("s3")
    s3_bucket = s3_resource.Bucket(bucket)
    obj = s3_bucket.Object(key)
    return obj.get()["Body"].read()

def handler(event, context):
    print(xgboost.__version__)
    print(time.time() - start)
