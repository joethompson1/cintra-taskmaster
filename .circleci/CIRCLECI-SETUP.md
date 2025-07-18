# CircleCI Setup Guide for Cintra Taskmaster

This guide will help you set up CircleCI for your cintra-taskmaster MCP server project.

## Prerequisites

1. GitHub repository connected to CircleCI
2. AWS Account with appropriate permissions
3. AWS ECR repository created for storing Docker images

## Setup Steps

### 1. Create AWS Resources

First, create the necessary AWS resources:

```bash
# Create ECR repository
aws ecr create-repository --repository-name cintra-taskmaster --region us-east-1

# Create ECS clusters (if using ECS for deployment)
aws ecs create-cluster --cluster-name cintra-taskmaster-staging
aws ecs create-cluster --cluster-name cintra-taskmaster-production
```

### 2. Configure AWS IAM Role

Create an IAM role that CircleCI can assume for deployments:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/oidc.circleci.com/org/YOUR_ORG_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.circleci.com/org/YOUR_ORG_ID:aud": "YOUR_ORG_ID"
        }
      }
    }
  ]
}
```

Attach the following policies to this role:
- `AmazonECS_FullAccess` (for ECS deployments)
- `AmazonEC2ContainerRegistryFullAccess` (for ECR access)

### 3. Configure CircleCI Environment Variables

In your CircleCI project settings, add these environment variables:

#### Required Variables:
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `AWS_DEFAULT_REGION` - Your preferred AWS region (e.g., us-east-1)

#### Optional Variables (if using different deployment method):
- `AWS_ACCESS_KEY_ID` - AWS access key (if not using OIDC)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (if not using OIDC)

### 4. Create CircleCI Context

Create a context called `aws-context` in your CircleCI organization settings and add the environment variables there for better security and reusability.

### 5. Update Configuration for Your Deployment Method

The provided configuration assumes ECS deployment. If you're using a different deployment method (Lambda, EC2, etc.), update the deployment jobs accordingly.

#### For Lambda Deployment:
```yaml
deploy-to-production:
  executor: docker
  steps:
    - attach_workspace:
        at: .
    - aws-cli/setup:
        role_arn: arn:aws:iam::${AWS_ACCOUNT_ID}:role/CircleCIRole
        role_session_name: circleci-cintra-taskmaster-deploy-prod
        session_duration: '1800'
    - run:
        name: Deploy to Lambda
        command: |
          # Update Lambda function with new image
          aws lambda update-function-code \
            --function-name cintra-taskmaster-production \
            --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/cintra-taskmaster:${CIRCLE_SHA1}
```

#### For EC2 Deployment:
```yaml
deploy-to-production:
  executor: docker
  steps:
    - attach_workspace:
        at: .
    - aws-cli/setup:
        role_arn: arn:aws:iam::${AWS_ACCOUNT_ID}:role/CircleCIRole
        role_session_name: circleci-cintra-taskmaster-deploy-prod
        session_duration: '1800'
    - run:
        name: Deploy to EC2
        command: |
          # Deploy using your preferred method (CodeDeploy, direct SSH, etc.)
          # Example using CodeDeploy:
          aws deploy create-deployment \
            --application-name cintra-taskmaster \
            --deployment-config-name CodeDeployDefault.ECS \
            --deployment-group-name production
```

### 6. Branch Strategy

The current configuration is set up for:
- `main` branch: Deploys to production
- `develop` branch: Deploys to staging
- All branches: Run tests and linting

You can modify the branch filters in the workflow section to match your preferred strategy.

### 7. Test the Setup

1. Push code to the `develop` branch to test staging deployment
2. Create a pull request to `main` to test the full pipeline
3. Monitor the CircleCI dashboard for any issues

## Configuration Details

### Jobs Overview:
- **install-and-cache**: Installs npm dependencies and caches them
- **lint**: Runs ESLint on the codebase
- **test**: Runs Jest tests and stores results
- **build-and-push-image**: Builds Docker image and pushes to ECR
- **deploy-to-staging**: Deploys to staging environment
- **deploy-to-production**: Deploys to production environment

### Customization Options:
- Modify the `deploy` parameter to control deployment behavior
- Add additional test jobs (integration tests, security scans, etc.)
- Configure notifications for build failures
- Add approval steps for production deployments

## Troubleshooting

### Common Issues:
1. **AWS Permission Denied**: Check IAM role permissions and trust policy
2. **ECR Repository Not Found**: Ensure ECR repository exists in the correct region
3. **ECS Service Not Found**: Verify ECS cluster and service names
4. **Build Failures**: Check that all npm scripts exist in package.json

### Debugging Steps:
1. Check CircleCI build logs for specific error messages
2. Verify AWS resources exist and are accessible
3. Test AWS CLI commands locally with the same permissions
4. Check that environment variables are set correctly

## Security Best Practices

1. Use OIDC instead of long-lived AWS credentials
2. Limit IAM permissions to minimum required
3. Use CircleCI contexts for sensitive environment variables
4. Regularly rotate credentials and review access logs
5. Enable CloudTrail for AWS API monitoring

## Next Steps

After successful setup:
1. Configure monitoring and alerting for your deployed application
2. Set up automated rollback procedures
3. Implement blue-green or canary deployments
4. Add performance and security testing to the pipeline
5. Configure backup and disaster recovery procedures 