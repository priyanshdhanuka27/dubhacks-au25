#!/bin/bash

# EventSync AWS Deployment Script
set -e

# Configuration
ENVIRONMENT=${1:-production}
REGION=${AWS_REGION:-us-west-2}
STACK_NAME="eventsync-${ENVIRONMENT}"
ECR_REPOSITORY_PREFIX="eventsync"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting EventSync deployment for environment: ${ENVIRONMENT}${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}📋 AWS Account ID: ${ACCOUNT_ID}${NC}"

# Create ECR repositories if they don't exist
echo -e "${YELLOW}🏗️  Creating ECR repositories...${NC}"

create_ecr_repo() {
    local repo_name=$1
    if ! aws ecr describe-repositories --repository-names "${repo_name}" --region "${REGION}" &> /dev/null; then
        echo "Creating ECR repository: ${repo_name}"
        aws ecr create-repository \
            --repository-name "${repo_name}" \
            --region "${REGION}" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
    else
        echo "ECR repository ${repo_name} already exists"
    fi
}

create_ecr_repo "${ECR_REPOSITORY_PREFIX}-backend"
create_ecr_repo "${ECR_REPOSITORY_PREFIX}-frontend"

# Login to ECR
echo -e "${YELLOW}🔐 Logging into ECR...${NC}"
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Build and push backend image
echo -e "${YELLOW}🏗️  Building and pushing backend image...${NC}"
cd back-end
docker build -t "${ECR_REPOSITORY_PREFIX}-backend:latest" .
docker tag "${ECR_REPOSITORY_PREFIX}-backend:latest" "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY_PREFIX}-backend:latest"
docker push "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY_PREFIX}-backend:latest"
cd ..

# Build and push frontend image
echo -e "${YELLOW}🏗️  Building and pushing frontend image...${NC}"
cd dubhacks
docker build -t "${ECR_REPOSITORY_PREFIX}-frontend:latest" .
docker tag "${ECR_REPOSITORY_PREFIX}-frontend:latest" "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY_PREFIX}-frontend:latest"
docker push "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY_PREFIX}-frontend:latest"
cd ..

# Deploy CloudFormation stack
echo -e "${YELLOW}☁️  Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file deploy/aws/cloudformation.yml \
    --stack-name "${STACK_NAME}" \
    --parameter-overrides \
        Environment="${ENVIRONMENT}" \
        DomainName="${DOMAIN_NAME:-eventsync.example.com}" \
        CertificateArn="${CERTIFICATE_ARN:-}" \
        VpcId="${VPC_ID}" \
        SubnetIds="${SUBNET_IDS}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "${REGION}" \
    --tags \
        Environment="${ENVIRONMENT}" \
        Application=EventSync \
        ManagedBy=CloudFormation

# Get stack outputs
echo -e "${YELLOW}📋 Getting stack outputs...${NC}"
USERS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`UsersTableName`].OutputValue' \
    --output text)

EVENTS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`EventsTableName`].OutputValue' \
    --output text)

OPENSEARCH_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchCollectionEndpoint`].OutputValue' \
    --output text)

ECS_CLUSTER=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
    --output text)

LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text)

TASK_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskRoleArn`].OutputValue' \
    --output text)

# Deploy ECS services
echo -e "${YELLOW}🚢 Deploying ECS services...${NC}"

# Create task definitions
envsubst < deploy/aws/backend-task-definition.json > /tmp/backend-task-definition.json
envsubst < deploy/aws/frontend-task-definition.json > /tmp/frontend-task-definition.json

# Register task definitions
aws ecs register-task-definition \
    --cli-input-json file:///tmp/backend-task-definition.json \
    --region "${REGION}"

aws ecs register-task-definition \
    --cli-input-json file:///tmp/frontend-task-definition.json \
    --region "${REGION}"

# Create or update services
aws ecs create-service \
    --cluster "${ECS_CLUSTER}" \
    --service-name "eventsync-${ENVIRONMENT}-backend" \
    --task-definition "eventsync-${ENVIRONMENT}-backend" \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${ECS_SECURITY_GROUP}],assignPublicIp=ENABLED}" \
    --region "${REGION}" || \
aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "eventsync-${ENVIRONMENT}-backend" \
    --task-definition "eventsync-${ENVIRONMENT}-backend" \
    --region "${REGION}"

aws ecs create-service \
    --cluster "${ECS_CLUSTER}" \
    --service-name "eventsync-${ENVIRONMENT}-frontend" \
    --task-definition "eventsync-${ENVIRONMENT}-frontend" \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${ECS_SECURITY_GROUP}],assignPublicIp=ENABLED}" \
    --region "${REGION}" || \
aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "eventsync-${ENVIRONMENT}-frontend" \
    --task-definition "eventsync-${ENVIRONMENT}-frontend" \
    --region "${REGION}"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application URL: https://${LOAD_BALANCER_DNS}${NC}"
echo -e "${GREEN}📊 Users Table: ${USERS_TABLE}${NC}"
echo -e "${GREEN}📅 Events Table: ${EVENTS_TABLE}${NC}"
echo -e "${GREEN}🔍 OpenSearch Endpoint: ${OPENSEARCH_ENDPOINT}${NC}"

# Clean up temporary files
rm -f /tmp/backend-task-definition.json /tmp/frontend-task-definition.json

echo -e "${GREEN}🎉 EventSync deployment complete!${NC}"