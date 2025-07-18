# Cintra-Taskmaster MCP Server

A TypeScript MCP (Model Context Protocol) server for Jira and Bitbucket task management with OAuth 2.0 support for Claude and header-based authentication for Cursor.

## Features

- 🌐 **Dual Authentication**: OAuth 2.0 for Claude, header-based for Cursor
- 🔐 **Atlassian OAuth 2.0 (3LO)**: Stateless JWT-based OAuth implementation
- 📋 **Jira Integration**: Create, read, update, delete tasks and subtasks
- 🔄 **Bitbucket Integration**: Link PRs to Jira tickets with context
- 🛡️ **Security**: Stateless JWT tokens, CSRF protection, CORS configuration
- 📝 **Logging**: Structured logging with Winston
- 🔧 **TypeScript**: Full TypeScript support with strict type checking
- ☁️ **Serverless Ready**: Stateless design perfect for serverless deployments
- 🧪 **Testing**: Jest testing framework with E2E tests
- 📊 **Health Checks**: Built-in health monitoring with OAuth status

## Authentication Methods

This MCP server supports two authentication methods:

### 1. OAuth 2.0 (for Claude)
- Uses Atlassian OAuth 2.0 (3LO) flow
- Stateless JWT tokens (no external storage required)
- Automatic token refresh
- Bearer token authentication to Jira/Bitbucket APIs

### 2. Header-based (for Cursor)
- Direct API token authentication
- Pass credentials via HTTP headers
- Basic authentication to Jira/Bitbucket APIs
- Suitable for local development

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Atlassian account with API access
- Jira project with appropriate permissions

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```bash
   # Jira Configuration (required)
   JIRA_API_URL=https://your-domain.atlassian.net
   JIRA_PROJECT=YOUR-PROJECT-KEY
   
   # For header-based auth (Cursor)
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-jira-api-token
   
   # Bitbucket Configuration (optional)
   BITBUCKET_WORKSPACE=your-workspace
   BITBUCKET_EMAIL=your-email@example.com
   BITBUCKET_API_TOKEN=your-bitbucket-api-token
   
   # OAuth Configuration (for Claude)
   ATLASSIAN_CLIENT_ID=your-atlassian-oauth-client-id
   ATLASSIAN_CLIENT_SECRET=your-atlassian-oauth-client-secret
   MCP_CLIENT_ID=${ATLASSIAN_CLIENT_ID}
   MCP_CLIENT_SECRET=${ATLASSIAN_CLIENT_SECRET}
   
   # Server Configuration
   BASE_URL=http://localhost:3000
   OAUTH_CALLBACK_URL=${BASE_URL}/auth/callback
   JWT_SECRET=your-jwt-secret-key
   PORT=3000
   ```

5. Build and start the server:
   ```bash
   npm run build
   npm start
   ```

   Or for development with hot reloading:
   ```bash
   npm run dev
   ```

### Verification

Visit `http://localhost:3000/health` to verify the server is running.

## Project Structure

```
src/
├── index.ts                    # Main server entry point
├── server/
│   ├── mcpServer.ts           # MCP server setup and tool registration
│   └── tools/                 # Individual MCP tool implementations
│       ├── get-task.ts        # Get Jira task details
│       ├── next-task.ts       # Find next task to work on
│       ├── add-task.ts        # Create new Jira issues
│       ├── update-task.ts     # Update existing tasks
│       ├── set-task-status.ts # Change task status
│       ├── remove-task.ts     # Delete tasks
│       ├── expand-jira-task.ts # Expand tasks into subtasks
│       ├── add-jira-comment.ts # Add comments to tasks
│       └── get-jira-attachment.ts # Get task attachments
├── middleware/
│   ├── oauth.ts               # OAuth middleware and token management
│   └── mcp-oauth-endpoints.ts # OAuth discovery and token endpoints
├── utils/
│   ├── jira/                  # Jira API client and utilities
│   ├── bitbucket/             # Bitbucket API client and utilities
│   ├── logger.ts              # Winston logging configuration
│   └── config.ts              # Configuration management
├── types/
│   ├── index.ts               # General TypeScript definitions
│   └── jira.ts                # Jira-specific type definitions
└── __tests__/                 # Test files
```

## MCP Tools

### Jira Task Management

- **`get_jira_task`**: Get detailed information about a specific Jira task
  - Supports images, comments, context, and subtasks
  - Includes related tickets and PR context
  
- **`next_jira_task`**: Find the next Jira task to work on based on dependencies and status
  - Dependency-aware task selection
  - Supports filtering by parent epic
  
- **`add_jira_issue`**: Create new Jira issues with markdown support
  - Full markdown formatting support
  - Automatic ADF (Atlassian Document Format) conversion
  - Support for epics, tasks, subtasks, and bugs
  
- **`update_jira_task`**: Update existing tasks using AI-powered field detection
  - LLM-powered intelligent field updates
  - Preserves unchanged content
  - Supports all ticket fields
  
- **`set_jira_task_status`**: Change the status of one or more tasks
  - Batch status updates
  - Supports all Jira workflow transitions
  
- **`remove_jira_task`**: Delete tasks from Jira
  - Supports single or multiple task deletion
  - Batch operations with detailed results
  
- **`expand_jira_task`**: Expand tasks into subtasks using AI
  - AI-generated subtask breakdown
  - Automatic dependency linking
  - Configurable subtask count

### Attachments and Comments

- **`get_jira_attachment`**: Get Jira attachments with automatic file type detection
  - Supports images (base64), PDFs, DOCX, and text files
  - Automatic text extraction from documents
  - Thumbnail support for images
  
- **`add_jira_comment`**: Add comments to Jira issues
  - Markdown support in comments
  - Automatic ADF conversion

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment (development/production) | No |
| `BASE_URL` | Base URL for the server | Yes (for OAuth) |
| `JIRA_API_URL` | Jira instance URL | Yes |
| `JIRA_PROJECT` | Jira project key | Yes |
| `JIRA_EMAIL` | Jira user email (header auth only) | No |
| `JIRA_API_TOKEN` | Jira API token (header auth only) | No |
| `BITBUCKET_WORKSPACE` | Bitbucket workspace | No |
| `BITBUCKET_EMAIL` | Bitbucket user email | No |
| `BITBUCKET_API_TOKEN` | Bitbucket API token | No |
| `ATLASSIAN_CLIENT_ID` | OAuth client ID | Yes (for OAuth) |
| `ATLASSIAN_CLIENT_SECRET` | OAuth client secret | Yes (for OAuth) |
| `MCP_CLIENT_ID` | MCP client ID (usually same as Atlassian) | Yes (for OAuth) |
| `MCP_CLIENT_SECRET` | MCP client secret (usually same as Atlassian) | Yes (for OAuth) |
| `OAUTH_CALLBACK_URL` | OAuth callback URL | Yes (for OAuth) |
| `JWT_SECRET` | JWT signing secret | Yes (for OAuth) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | No |

## API Endpoints

### Core Endpoints

- `GET /health` - Health check endpoint with OAuth status
- `POST /mcp` - MCP protocol endpoint (requires authentication)
- `GET /mcp` - MCP protocol endpoint (requires authentication)

### OAuth Endpoints

- `GET /auth/.well-known/oauth-authorization-server` - OAuth discovery metadata
- `POST /auth/register` - Client registration (returns pre-configured credentials)
- `GET /auth/authorize` - OAuth authorization endpoint
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/token` - OAuth token exchange and refresh
- `POST /auth/revoke` - OAuth token revocation

## Development

### Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript to JavaScript
npm run start      # Start production server
npm run test       # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run clean      # Clean build directory
```

### Testing with MCP Inspector

1. Install MCP Inspector:
   ```bash
   npx @modelcontextprotocol/inspector
   ```

2. Configure your server URL: `http://localhost:3000/mcp`

3. Complete the OAuth flow through the Inspector interface

4. Test the available tools and their functionality

### Adding New Tools

1. Create a new file in `src/server/tools/`
2. Implement the tool using the `server.registerTool()` pattern
3. Register the tool in `src/server/mcpServer.ts`
4. Add appropriate TypeScript types in `src/types/`

## Deployment

### Docker

Build and run with Docker:
```bash
docker build -t cintra-taskmaster .
docker run -p 3000:3000 --env-file .env cintra-taskmaster
```

### Docker Compose

For local development:
```bash
docker-compose up
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files with secrets
2. **JWT Secrets**: Use strong, unique JWT secrets in production
3. **OAuth Configuration**: Ensure OAuth callback URLs are properly configured
4. **CORS**: Configure allowed origins appropriately
5. **HTTPS**: Always use HTTPS in production
6. **Token Validation**: JWT tokens are stateless and self-contained

## OAuth Implementation Details

This server implements a **stateless OAuth proxy** that:

1. **Handles OAuth flows** between Claude and Atlassian
2. **Creates JWT tokens** containing Atlassian access tokens
3. **Eliminates external storage** requirements (Redis, databases)
4. **Supports token refresh** automatically
5. **Works in serverless environments** without persistent storage

The OAuth flow:
1. Client requests authorization → Server redirects to Atlassian
2. User authorizes → Atlassian redirects back with auth code
3. Server exchanges code for Atlassian tokens
4. Server creates JWT containing Atlassian tokens
5. Client uses JWT for subsequent API calls
6. Server decodes JWT and uses Atlassian tokens for API requests

## Troubleshooting

### Common Issues

1. **OAuth callback errors**: Check `OAUTH_CALLBACK_URL` matches Atlassian app config
2. **JWT token errors**: Ensure `JWT_SECRET` is set and consistent
3. **Jira API errors**: Verify `JIRA_API_URL` and project permissions
4. **CORS issues**: Check `ALLOWED_ORIGINS` configuration
5. **Build errors**: Run `npm install` and check TypeScript configuration

### Logs

Logs are written to:
- `logs/combined-YYYY-MM-DD.log` - All logs with timestamps
- `logs/error-YYYY-MM-DD.log` - Error logs only
- Console output (development mode)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Atlassian OAuth 2.0 Documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Bitbucket REST API Documentation](https://developer.atlassian.com/cloud/bitbucket/rest/)


[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=cintra-taskmaster&config=JTdCJTIydXJsJTIyJTNBJTIyaHR0cHMlM0ElMkYlMkZjaW50cmEtdGFza21hc3Rlci0yMjQ4NjMyMDM4OTAuZXVyb3BlLXdlc3QxLnJ1bi5hcHAlMkZtY3AlMjIlMkMlMjJoZWFkZXJzJTIyJTNBJTdCJTIyeC1hdGxhc3NpYW4tZW1haWwlMjIlM0ElMjIlMjIlMkMlMjJ4LWppcmEtYXBpLXRva2VuJTIyJTNBJTIyJTIyJTJDJTIyeC1qaXJhLXByb2plY3QlMjIlM0ElMjIlMjIlMkMlMjJ4LWJpdGJ1Y2tldC1hcGktdG9rZW4lMjIlM0ElMjIlMjIlN0QlN0Q%3D)