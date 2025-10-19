#!/bin/bash

# AWS Lambda Deployment Script
# Serverless option - no servers to manage

set -e

echo "⚡ Deploying EventSync Backend to AWS Lambda..."

# Configuration
FUNCTION_NAME="eventsync-backend"
REGION="us-east-1"
RUNTIME="nodejs18.x"

# Create deployment package
echo "📦 Creating deployment package..."
cd back-end
npm ci --production
zip -r ../lambda-deployment.zip . -x "*.test.js" "test/*" "*.md"
cd ..

# Create IAM role for Lambda
echo "📋 Creating IAM role for Lambda..."

cat > lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

cat > lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:*:table/eventsync-*",
        "arn:aws:dynamodb:${REGION}:*:table/eventsync-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:*:*"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name EventSyncLambdaRole \
  --assume-role-policy-document file://lambda-trust-policy.json \
  --region $REGION || echo "Role may already exist"

# Attach policies
aws iam attach-role-policy \
  --role-name EventSyncLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --region $REGION

aws iam put-role-policy \
  --role-name EventSyncLambdaRole \
  --policy-name DynamoDBAccess \
  --policy-document file://lambda-policy.json \
  --region $REGION

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name EventSyncLambdaRole --query 'Role.Arn' --output text)

echo "✅ IAM Role created: $ROLE_ARN"

# Wait for role to be ready
echo "⏳ Waiting for IAM role to be ready..."
sleep 10

# Create Lambda function
echo "🏗️ Creating Lambda function..."
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime $RUNTIME \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://lambda-deployment.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{NODE_ENV=production,AWS_REGION=$REGION,DYNAMODB_TABLE_USERS=eventsync-production-users,DYNAMODB_TABLE_EVENTS=eventsync-production-events}" \
  --region $REGION || echo "Function may already exist, updating..."

# Update function if it already exists
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://lambda-deployment.zip \
  --region $REGION

# Create API Gateway
echo "🌐 Creating API Gateway..."
API_ID=$(aws apigatewayv2 create-api \
  --name eventsync-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME \
  --query 'ApiId' \
  --output text \
  --region $REGION)

# Add Lambda permission for API Gateway
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
  --region $REGION || echo "Permission may already exist"

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --query 'ApiEndpoint' --output text --region $REGION)

echo "✅ Lambda function created successfully!"
echo "🔗 API Endpoint: $API_ENDPOINT"

# Cleanup
rm -f lambda-deployment.zip lambda-trust-policy.json lambda-policy.json

echo "🎉 Deployment complete!"