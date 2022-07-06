import time
start = time.time()
import xgboost
from layer import version


def handler(event, context):
    print('Layer version ', version)
    print(xgboost.__version__)

