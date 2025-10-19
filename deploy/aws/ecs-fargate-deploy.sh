#!/bin/bash

# AWS ECS Fargate Deployment Script
# Container-based deployment without managing servers

set -e

echo "🐳 Deploying EventSync Backend to AWS ECS Fargate..."

# Configuration
CLUSTER_NAME="eventsync-cluster"
SERVICE_NAME="eventsync-backend-service"
TASK_DEFINITION="eventsync-backend"
REGION="us-east-1"
IMAGE_NAME="eventsync-backend"

# Create ECR repository
echo "📦 Creating ECR repository..."
aws ecr create-repository --repository-name $IMAGE_NAME --region $REGION || echo "Repository may already exist"

# Get ECR login
ECR_URI=$(aws ecr describe-repositories --repository-names $IMAGE_NAME --region $REGION --query 'repositories[0].repositoryUri' --output text)
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

# Build and push Docker image
echo "🏗️ Building Docker image..."
cd back-end
docker build -t $IMAGE_NAME .
docker tag $IMAGE_NAME:latest $ECR_URI:latest
docker push $ECR_URI:latest
cd ..

# Create IAM role for ECS task
echo "📋 Creating IAM roles..."

cat > ecs-task-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

cat > ecs-execution-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

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
    }
  ]
}
EOF

# Create task role
aws iam create-role \
  --role-name EventSyncECSTaskRole \
  --assume-role-policy-document file://ecs-task-trust-policy.json \
  --region $REGION || echo "Task role may already exist"

aws iam put-role-policy \
  --role-name EventSyncECSTaskRole \
  --policy-name DynamoDBAccess \
  --policy-document file://dynamodb-policy.json \
  --region $REGION

# Create execution role
aws iam create-role \
  --role-name EventSyncECSExecutionRole \
  --assume-role-policy-document file://ecs-execution-trust-policy.json \
  --region $REGION || echo "Execution role may already exist"

aws iam attach-role-policy \
  --role-name EventSyncECSExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region $REGION

# Get role ARNs
TASK_ROLE_ARN=$(aws iam get-role --role-name EventSyncECSTaskRole --query 'Role.Arn' --output text)
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name EventSyncECSExecutionRole --query 'Role.Arn' --output text)

# Create ECS cluster
echo "🏗️ Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION || echo "Cluster may already exist"

# Create task definition
echo "📋 Creating task definition..."
cat > task-definition.json << EOF
{
  "family": "$TASK_DEFINITION",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "$IMAGE_NAME",
      "image": "$ECR_URI:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "$REGION"},
        {"name": "DYNAMODB_TABLE_USERS", "value": "eventsync-production-users"},
        {"name": "DYNAMODB_TABLE_EVENTS", "value": "eventsync-production-events"},
        {"name": "PORT", "value": "3001"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$TASK_DEFINITION",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Create log group
aws logs create-log-group --log-group-name "/ecs/$TASK_DEFINITION" --region $REGION || echo "Log group may already exist"

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $REGION

# Create service (you'll need to specify VPC and security groups)
echo "🚀 Creating ECS service..."
echo "⚠️  You need to specify your VPC subnet IDs and security group ID"
echo "   Use: aws ecs create-service with your network configuration"

echo "✅ ECS Fargate setup complete!"
echo "🔗 Complete the deployment by creating the ECS service with your VPC configuration"

# Cleanup
rm -f ecs-task-trust-policy.json ecs-execution-trust-policy.json dynamodb-policy.json task-definition.json

echo "🎉 Container deployment ready!"