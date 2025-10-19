#!/bin/bash

# AWS App Runner Deployment Script
# Easiest way to deploy Node.js backend without EC2

set -e

echo "🚀 Deploying EventSync Backend to AWS App Runner..."

# Configuration
SERVICE_NAME="eventsync-backend"
REGION="us-east-1"
SOURCE_CODE_VERSION="main"  # or your branch name

# Create IAM role for App Runner service
echo "📋 Creating IAM role for App Runner..."

# Create trust policy for App Runner
cat > apprunner-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create DynamoDB access policy
cat > dynamodb-policy.json << EOF
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
  --role-name EventSyncAppRunnerRole \
  --assume-role-policy-document file://apprunner-trust-policy.json \
  --region $REGION || echo "Role may already exist"

# Attach policy
aws iam put-role-policy \
  --role-name EventSyncAppRunnerRole \
  --policy-name DynamoDBAccess \
  --policy-document file://dynamodb-policy.json \
  --region $REGION

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name EventSyncAppRunnerRole --query 'Role.Arn' --output text)

echo "✅ IAM Role created: $ROLE_ARN"

# Create App Runner service configuration
cat > apprunner-config.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "AutoDeploymentsEnabled": true,
    "CodeRepository": {
      "RepositoryUrl": "$(git config --get remote.origin.url)",
      "SourceCodeVersion": {
        "Type": "BRANCH",
        "Value": "$SOURCE_CODE_VERSION"
      },
      "CodeConfiguration": {
        "ConfigurationSource": "REPOSITORY",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_16",
          "BuildCommand": "npm ci && npm run build",
          "StartCommand": "npm start",
          "RuntimeEnvironmentVariables": {
            "NODE_ENV": "production",
            "AWS_REGION": "$REGION",
            "DYNAMODB_TABLE_USERS": "eventsync-production-users",
            "DYNAMODB_TABLE_EVENTS": "eventsync-production-events",
            "PORT": "3001"
          }
        }
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "0.25 vCPU",
    "Memory": "0.5 GB",
    "InstanceRoleArn": "$ROLE_ARN"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF

# Create the App Runner service
echo "🏗️ Creating App Runner service..."
aws apprunner create-service \
  --cli-input-json file://apprunner-config.json \
  --region $REGION

echo "✅ App Runner service created successfully!"
echo "🔗 Check status: aws apprunner describe-service --service-arn <service-arn> --region $REGION"

# Cleanup temporary files
rm -f apprunner-trust-policy.json dynamodb-policy.json apprunner-config.json

echo "🎉 Deployment complete! Your backend will be available at the App Runner URL."