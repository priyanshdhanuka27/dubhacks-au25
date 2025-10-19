# 🚀 EventSync Deployment Guide

This guide provides multiple deployment options for your EventSync backend, from local development to production deployment without requiring EC2.

## 📋 Prerequisites

1. **AWS CLI installed and configured**
2. **Docker installed** (for container options)
3. **Node.js 16+** installed
4. **Your DynamoDB tables created** (Users, Events)

## 🎯 Deployment Options

### Option 1: AWS App Runner (⭐ RECOMMENDED)

**Best for:** Easy deployment, automatic scaling, minimal configuration

```bash
# Make the script executable
chmod +x deploy/aws/apprunner-deploy.sh

# Deploy to App Runner
./deploy/aws/apprunner-deploy.sh
```

**Benefits:**
- ✅ No server management
- ✅ Automatic scaling
- ✅ Built-in load balancing
- ✅ Easy CI/CD integration
- ✅ IAM roles handled automatically

**Cost:** ~$25-50/month for small apps

---

### Option 2: AWS Lambda + API Gateway (Serverless)

**Best for:** Pay-per-use, event-driven workloads

```bash
# Make the script executable
chmod +x deploy/aws/lambda-deploy.sh

# Deploy to Lambda
./deploy/aws/lambda-deploy.sh
```

**Benefits:**
- ✅ Pay only for requests
- ✅ Automatic scaling
- ✅ No server management
- ✅ Built-in monitoring

**Cost:** ~$0-10/month for small apps

---

### Option 3: AWS ECS Fargate (Container-based)

**Best for:** Full container control, complex applications

```bash
# Make the script executable
chmod +x deploy/aws/ecs-fargate-deploy.sh

# Deploy to ECS Fargate
./deploy/aws/ecs-fargate-deploy.sh
```

**Benefits:**
- ✅ Full container control
- ✅ No server management
- ✅ Easy scaling
- ✅ VPC networking

**Cost:** ~$15-30/month for small apps

---

### Option 4: Local Development

**Best for:** Development and testing

```bash
# Make the script executable
chmod +x deploy/local/setup-aws-credentials.sh

# Set up local AWS credentials
./deploy/local/setup-aws-credentials.sh

# Start development server
cd back-end
npm run dev
```

**Benefits:**
- ✅ Fast development cycle
- ✅ Easy debugging
- ✅ No deployment needed

---

## 🔧 Manual IAM Setup (If Scripts Don't Work)

### Step 1: Create IAM Policy

1. Go to **IAM Console** → **Policies** → **Create Policy**
2. Use **JSON** tab and paste:

```json
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
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/eventsync-*",
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/eventsync-*/index/*"
      ]
    }
  ]
}
```

3. Name it `EventSyncDynamoDBPolicy`

### Step 2: Create IAM Role

1. Go to **IAM Console** → **Roles** → **Create Role**
2. Choose service based on your deployment:
   - **App Runner**: `tasks.apprunner.amazonaws.com`
   - **Lambda**: `lambda.amazonaws.com`
   - **ECS**: `ecs-tasks.amazonaws.com`
3. Attach the `EventSyncDynamoDBPolicy`
4. Name it `EventSyncServiceRole`

### Step 3: Get Your Table ARN

1. Go to **DynamoDB Console**
2. Click your table name
3. Copy the **Table ARN** from the overview

---

## 🌍 Environment Variables

### Production Environment Variables

```bash
# Required for all deployments
NODE_ENV=production
AWS_REGION=us-east-1
JWT_SECRET=your-super-secret-jwt-key

# DynamoDB Tables
DYNAMODB_TABLE_USERS=eventsync-production-users
DYNAMODB_TABLE_EVENTS=eventsync-production-events

# Optional - for advanced features
OPENSEARCH_ENDPOINT=your-opensearch-endpoint
BEDROCK_KNOWLEDGE_BASE_ID=your-knowledge-base-id
```

### Local Development Environment Variables

```bash
# Required for local development
NODE_ENV=development
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# DynamoDB Tables
DYNAMODB_TABLE_USERS=eventsync-dev-users
DYNAMODB_TABLE_EVENTS=eventsync-dev-events

# Server Configuration
PORT=3001
JWT_SECRET=dev-secret-key
CORS_ORIGIN=http://localhost:3000
```

---

## 🔍 Troubleshooting

### Common Issues

1. **"Access Denied" errors**
   - Check IAM role has DynamoDB permissions
   - Verify table ARN in policy matches your actual table

2. **"Table not found" errors**
   - Ensure table names match environment variables
   - Check AWS region matches your tables

3. **"Invalid credentials" errors**
   - For local: Check AWS credentials are configured
   - For production: Ensure IAM role is attached to service

### Testing Your Setup

```bash
# Test DynamoDB connection
aws dynamodb describe-table --table-name eventsync-production-users --region us-east-1

# Test your backend locally
cd back-end
npm test

# Check logs (for deployed services)
# App Runner: Check App Runner console
# Lambda: Check CloudWatch logs
# ECS: Check ECS service logs
```

---

## 📊 Cost Comparison

| Option | Monthly Cost (Small App) | Scaling | Management |
|--------|-------------------------|---------|------------|
| App Runner | $25-50 | Automatic | Minimal |
| Lambda | $0-10 | Automatic | Minimal |
| ECS Fargate | $15-30 | Manual/Auto | Medium |
| Local Dev | $0 | N/A | High |

---

## 🎉 Next Steps

1. **Choose your deployment option**
2. **Run the deployment script**
3. **Update your frontend API endpoint**
4. **Test the integration**
5. **Set up monitoring and logging**

## 🆘 Need Help?

- Check AWS CloudWatch logs for errors
- Verify IAM permissions in AWS Console
- Test DynamoDB access with AWS CLI
- Review environment variables

Your EventSync backend will be running securely with proper DynamoDB access! 🚀