docker run --network host --rm -e AWS_ACCESS_KEY_ID=DUMMY -e AWS_SECRET_ACCESS_KEY=DUMMY amazon/aws-cli:2.15.10 dynamodb delete-table --endpoint-url http://localhost:8000 --region eu-west-3 --table-name Players_S14_dev
docker run --network host --rm -e AWS_ACCESS_KEY_ID=DUMMY -e AWS_SECRET_ACCESS_KEY=DUMMY amazon/aws-cli:2.15.10 dynamodb delete-table --endpoint-url http://localhost:8000 --region eu-west-3 --table-name Histories_S14_dev
docker run --network host --rm -e AWS_ACCESS_KEY_ID=DUMMY -e AWS_SECRET_ACCESS_KEY=DUMMY amazon/aws-cli:2.15.10 dynamodb delete-table --endpoint-url http://localhost:8000 --region eu-west-3 --table-name Archived_Histories_S14_dev
docker run --network host --rm -e AWS_ACCESS_KEY_ID=DUMMY -e AWS_SECRET_ACCESS_KEY=DUMMY amazon/aws-cli:2.15.10 dynamodb create-table --endpoint-url http://localhost:8000 --region eu-west-3 --table-name Players_S14_dev --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST
docker run --network host --rm -e AWS_ACCESS_KEY_ID=DUMMY -e AWS_SECRET_ACCESS_KEY=DUMMY amazon/aws-cli:2.15.10 dynamodb create-table --endpoint-url http://localhost:8000 --region eu-west-3 --table-name Histories_S14_dev --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST
docker run --network host --rm -e AWS_ACCESS_KEY_ID=DUMMY -e AWS_SECRET_ACCESS_KEY=DUMMY amazon/aws-cli:2.15.10 dynamodb create-table --endpoint-url http://localhost:8000 --region eu-west-3 --table-name Archived_Histories_S14_dev --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST