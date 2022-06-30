import time
start = time.time()
import xgboost


def handler(event, context):
    print(xgboost.__version__)
    print(time.time() - start)
