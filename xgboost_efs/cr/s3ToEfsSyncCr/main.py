import logging
import os
import boto3
import zipfile
from io import BytesIO
import shutil

logger = logging.getLogger()
logger.setLevel(logging.INFO)

mount_target = os.environ['MOUNT_TARGET']
s3_syncs = os.environ['S3_SYNCS']

s3 = boto3.client('s3')


def handler(event, context):
    print(event)
    print('MOUNT_TARGET: ', mount_target)
    print('S3_SYNCS: ', s3_syncs)


    if 'RequestType' in event:
        request_type = event['RequestType']
        if request_type == 'Create': return on_create(event)
        if request_type == 'Update': return on_create(event)
        if request_type == 'Delete': return on_delete(event)


def on_create(event):
    props = event["ResourceProperties"]
    print("create new resource with props %s" % props)

    clear_mnt()
    sync_s3()

    ok_result = {'status': 'ok'}

    return {'Data': ok_result}


def on_delete(event):
    # No action to take
    pass


def clear_mnt():
    for f in os.listdir(mount_target):
        file_path = os.path.join(mount_target, f)
        print('delete ', file_path)
        if os.path.isfile(file_path):
            os.remove(file_path)
        else:
            shutil.rmtree(file_path, ignore_errors=True)


def sync_s3():
    for sync in s3_syncs.split(';'):
        bucket, zip_key, sync_path = sync.split(':')

        full_path = os.path.join(mount_target, sync_path)
        os.makedirs(full_path, exist_ok=True)

        s3_buffer = BytesIO(s3.get_object(Bucket=bucket, Key=zip_key)['Body'].read())
        print('extract zip to:', full_path)
        extract_zip(full_path, s3_buffer)



def extract_zip(target_folder, zip_buffer):
    print('extract to ', target_folder)
    with zipfile.ZipFile(zip_buffer) as z:
        z.extractall(target_folder)
        print('extract done')
