# Docker Setup Guide for Cintra-Taskmaster

This guide will help you dockerize and run the cintra-taskmaster MCP server using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Your Atlassian (Jira/Bitbucket) credentials

## Quick Start

1. **Clone and Configure**
   ```bash
   git clone <your-repo>
   cd cintra-taskmaster
   
   # Create .env file with your OAuth configuration
   # See the Environment Configuration section below for required variables
   ```

2. **Validate OAuth Configuration**
   ```bash
   # Run the OAuth validation script
   node validate-oauth.js
   ```

3. **Build and Deploy**
   build from Dockerfile

4. **Access the Server**
   - MCP Server: http://localhost:3000/mcp
   - Health Check: http://localhost:3000/health

## Environment Configuration

### 1. Create Environment File

Create a `.env` file in the root directory with your configuration:

```env
# Jira Configuration
JIRA_API_URL=https://your-domain.atlassian.net

# Bitbucket Configuration  
BITBUCKET_WORKSPACE=your-workspace

# OAuth Configuration (required for MCP Inspector OAuth flow)
BASE_URL=http://localhost:3000
OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback
ATLASSIAN_CLIENT_ID=your-atlassian-oauth-client-id
ATLASSIAN_CLIENT_SECRET=your-atlassian-oauth-client-secret
MCP_CLIENT_ID=your-atlassian-oauth-client-id
MCP_CLIENT_SECRET=your-atlassian-oauth-client-secret
JWT_SECRET=your-jwt-secret-key

# Logging (optional)
LOG_LEVEL=info
NODE_ENV=production
PORT=3000
```

**Important for Production Deployment:**
- Replace `http://localhost:3000` with your actual deployment URL
- Ensure `OAUTH_CALLBACK_URL` matches your Atlassian OAuth app configuration
- Use a strong, random `JWT_SECRET` for production
- Never commit your `.env` file to version control

### 2. User Authentication

The application uses **header-based authentication** for security. Each request must include:

```bash
# Required headers for API calls
curl -X POST http://localhost:3000/mcp \
  -H "x-atlassian-email: your-email@domain.com" \
  -H "x-jira-api-token: your-jira-token" \
  -H "x-bitbucket-api-token: your-bitbucket-token" \
  -H "x-jira-project: YOUR-PROJECT-KEY" \
  -H "mcp-session-id: unique-session-id" \
  -H "Content-Type: application/json"
```

## Docker Commands

## Build Only Docker Image

If you prefer to build just the Docker image:

```bash
# Build the image
docker build -t cintra-taskmaster:latest .

# Run the container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  -e JIRA_API_URL=https://your-domain.atlassian.net \
  -e BITBUCKET_WORKSPACE=your-workspace \
  -e BASE_URL=http://localhost:3000 \
  -e OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback \
  -e ATLASSIAN_CLIENT_ID=your-atlassian-oauth-client-id \
  -e ATLASSIAN_CLIENT_SECRET=your-atlassian-oauth-client-secret \
  -e MCP_CLIENT_ID=your-atlassian-oauth-client-id \
  -e MCP_CLIENT_SECRET=your-atlassian-oauth-client-secret \
  -e JWT_SECRET=your-jwt-secret-key \
  -e LOG_LEVEL=info \
  --name cintra-taskmaster \
  cintra-taskmaster:latest
```

## Health Checks

The application includes health checks:

# Manual health check
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 1234.5,
  "sessions": 0
}
```

## Logging

Logs are mounted to `./logs` directory:

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log


## Monitoring

Monitor your MCP server:

```bash
# Check resource usage
docker stats cintra-taskmaster

# View system info
docker system df

# Check container health
docker inspect cintra-taskmaster | jq '.[0].State.Health'
```
