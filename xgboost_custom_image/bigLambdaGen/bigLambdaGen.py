import os
import time
start = time.time()
import sys
import boto3
from importlib import import_module
import zipfile
import requests

bucket = os.environ.get('CODE_BUCKET')
key = os.environ.get('CODE_KEY')
entry_point = os.environ.get('CODE_ENTRY_POINT')
layer_arns = os.environ.get('LAYER_ARNS')
entry_point_function = None


def load_function_code():
    global entry_point_function
    try:
        s3 = boto3.client('s3')
        s3.download_file(bucket, key, '/tmp/code.zip')
        if not os.path.exists('/tmp/code'):
            os.mkdir('/tmp/code')
        with zipfile.ZipFile('/tmp/code.zip', 'r') as zip_ref:
            zip_ref.extractall('/tmp/code')
        sys.path.append('/tmp/code')
        p, m = entry_point.rsplit('.', 1)
        mod = import_module(p)
        entry_point_function = getattr(mod, m)
    except Exception as e:
        print('Failed to extract lambda code', e)


def load_layers():
    try:
        lambda_client = boto3.client('lambda')
        for layer_arn in layer_arns.split(';'):
            layer_version_info = lambda_client.get_layer_version_by_arn(Arn=layer_arn)
            layer_location = layer_version_info.get('Content').get('Location')
            get_layer_response = requests.get(layer_location)
            layer_file_name = layer_arn + '.zip'
            layers_path = '/tmp/layers'
            layer_file_path = os.path.join(layers_path, layer_file_name)
            if not os.path.exists(layers_path):
                os.mkdir(layers_path)
            with open(layer_file_path, 'wb') as layer_zip:
                layer_zip.write(get_layer_response.content)
            with zipfile.ZipFile(layer_file_path, 'r') as zip_ref:
                zip_ref.extractall(layers_path)
            sys.path.append('/tmp/layers/python')
    except Exception as e:
        print('Failed to extract layer code', e)


load_layers()
load_function_code()


def handler(event, context):
    entry_point_function(event, context)
    print(time.time() - start)





