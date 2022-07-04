FROM public.ecr.aws/lambda/python:3.9

COPY /bigLambdaGen/ ${LAMBDA_TASK_ROOT}/
RUN ls ${LAMBDA_TASK_ROOT}/
RUN pip install xgboost==1.3.1


CMD [ "bigLambdaGen.handler" ]