import os
import sys
import boto3
from importlib import import_module

bucket = os.environ.get('CODE_BUCKET')
key = os.environ.get('CODE_KEY')
entry_point = os.environ.get('CODE_ENTRY_POINT')

s3 = boto3.client('s3')
s3.download_file(bucket, key, '/tmp/code.zip')

if bool(os.environ.get('UNZIP_REQ', 'True')):
    try:
        import zipfile
        print(os.listdir('/tmp'))
        os.mkdir('/tmp/code')
        with zipfile.ZipFile('/tmp/code.zip', 'r') as zip_ref:
            zip_ref.extractall('/tmp/code')
        print(os.listdir('/tmp/code'))
        sys.path.append('/tmp/code')

        p, m = entry_point.rsplit('.', 1)
        mod = import_module(p)
        met = getattr(mod, m)

    except ImportError as e:
        print('Failed to extract lambda code', e)


def handler(event, context):
    met(event, context)





