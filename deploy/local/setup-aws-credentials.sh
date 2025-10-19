#!/bin/bash

# Local Development AWS Setup
# For development and testing without deploying to AWS

set -e

echo "🔧 Setting up AWS credentials for local development..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   macOS: brew install awscli"
    echo "   Linux: sudo apt-get install awscli"
    echo "   Windows: Download from AWS website"
    exit 1
fi

# Create IAM user for local development
echo "👤 Creating IAM user for local development..."

USER_NAME="eventsync-dev-user"

# Create IAM user
aws iam create-user --user-name $USER_NAME || echo "User may already exist"

# Create policy for DynamoDB access
cat > dev-dynamodb-policy.json << EOF
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
        "dynamodb:BatchWriteItem",
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:ListTables"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/eventsync-*",
        "arn:aws:dynamodb:*:*:table/eventsync-*/index/*"
      ]
    }
  ]
}
EOF

# Create and attach policy
aws iam put-user-policy \
  --user-name $USER_NAME \
  --policy-name EventSyncDevPolicy \
  --policy-document file://dev-dynamodb-policy.json

# Create access keys
echo "🔑 Creating access keys..."
CREDENTIALS=$(aws iam create-access-key --user-name $USER_NAME --output json)

ACCESS_KEY_ID=$(echo $CREDENTIALS | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $CREDENTIALS | jq -r '.AccessKey.SecretAccessKey')

# Configure AWS CLI
echo "⚙️ Configuring AWS CLI..."
aws configure set aws_access_key_id $ACCESS_KEY_ID
aws configure set aws_secret_access_key $SECRET_ACCESS_KEY
aws configure set default.region us-east-1
aws configure set default.output json

# Create .env file for local development
echo "📝 Creating .env file for local development..."
cat > ../back-end/.env.local << EOF
# Local Development Environment Variables
NODE_ENV=development
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY

# DynamoDB Tables
DYNAMODB_TABLE_USERS=eventsync-dev-users
DYNAMODB_TABLE_EVENTS=eventsync-dev-events

# Server Configuration
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
EOF

echo "✅ AWS credentials configured successfully!"
echo "🔐 Access Key ID: $ACCESS_KEY_ID"
echo "🔐 Secret Access Key: [HIDDEN]"
echo ""
echo "📁 Environment file created at: back-end/.env.local"
echo ""
echo "🚀 You can now run your backend locally with:"
echo "   cd back-end"
echo "   npm run dev"
echo ""
echo "⚠️  IMPORTANT: Never commit the .env.local file to version control!"

# Cleanup
rm -f dev-dynamodb-policy.json

echo "🎉 Local development setup complete!"