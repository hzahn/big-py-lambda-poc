import os
import sys
import time

start = time.time()
import boto3
import zipfile

bucket = os.environ.get('DEP_BUCKET')
key = os.environ.get('DEP_KEY')


def unzip_dep():
    print(os.path.exists('/tmp/dep/python'))

    if not os.path.exists('/tmp/dep/python'):
        print('ls /tmp  -> ', os.listdir('/tmp'))
        print('download')
        s3 = boto3.client('s3')
        s3.download_file(bucket, key, '/tmp/code.zip')
        print('ls /tmp  -> ', os.listdir('/tmp'))
        try:
            print('unzip')
            with zipfile.ZipFile('/tmp/code.zip', 'r') as zip_ref:
                zip_ref.extractall('/tmp/dep')
            print('extracted Folder:', os.listdir('/tmp/dep/python'))
            print('xgboost:', os.listdir('/tmp/dep/python/numpy/xgboost'))
            print('numpy pycache:', os.listdir('/tmp/dep/python/numpy/__pycache__'))

            sys.path.insert(0, '/tmp/dep/python')
            import xgboost
        except Exception as e:
            print('Failed to extract dependency:', e)



def handler(event, context):
    unzip_dep()
    print(xgboost.__version__)
    print(time.time() - start)
