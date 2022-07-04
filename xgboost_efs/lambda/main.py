import time
import os
import sys
start = time.time()
print(os.listdir('/mnt/opt/python'))
print('PAYTHONPATH: ', os.environ.get('PYTHONPATH'))
import xgboost


def handler(event, context):
    print(xgboost.__version__)
    print(time.time() - start)
