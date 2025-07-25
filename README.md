# Cintra-Taskmaster MCP Server

A TypeScript MCP (Model Context Protocol) server for Jira and Bitbucket task management with dual authentication support.

## Features

- 🌐 **Dual Authentication**: OAuth 2.0 for Claude, header-based for Cursor
- 📋 **Jira Integration**: Create, read, update, delete tasks and subtasks
- 🔄 **Bitbucket Integration**: Link PRs to Jira tickets with context
- 🔧 **TypeScript**: Full TypeScript support with Zod validation
- 🧪 **Testing**: Jest testing framework with safety-focused E2E tests
- 📝 **Logging**: Structured logging with Winston

## Quick Start

### Prerequisites
- Node.js 18+
- Atlassian account with API access
- Jira project with appropriate permissions

### Installation

1. Clone and install:
   ```bash
   git clone <repository>
   cd cintra-taskmaster
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. Required environment variables:
   ```bash
   # Jira Configuration
   JIRA_API_URL=https://your-domain.atlassian.net
   JIRA_PROJECT=YOUR-PROJECT-KEY
   
   # For header-based auth (Cursor)
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-jira-api-token
   
   # For AI features
   ANTHROPIC_API_KEY=your-anthropic-api-key
   
   # For OAuth (Claude)
   ATLASSIAN_CLIENT_ID=your-client-id
   ATLASSIAN_CLIENT_SECRET=your-client-secret
   BASE_URL=http://localhost:3000
   JWT_SECRET=your-jwt-secret
   ```

4. Start the server:
   ```bash
   npm run build
   npm start
   ```

Visit `http://localhost:3000/health` to verify the server is running.

## Project Structure

```
src/
├── server/tools/              # MCP tool implementations
│   ├── get-task.ts           # Get Jira task details
│   ├── add-task.ts           # Create new issues
│   ├── update-task.ts        # Update existing tasks
│   ├── set-task-status.ts    # Change task status
│   ├── next-task.ts          # Find next task to work on
│   ├── expand-jira-task.ts   # Expand tasks into subtasks
│   ├── add-jira-comment.ts   # Add comments
│   ├── get-jira-attachment.ts # Get attachments
│   └── remove-task.ts        # Delete tasks
├── utils/
│   ├── jira/                 # Jira client and utilities
│   ├── bitbucket/            # Bitbucket integration
│   ├── config.ts             # Configuration management
│   ├── logger.ts             # Winston logging
│   └── utils.ts              # Utility functions
├── middleware/               # OAuth and authentication
├── types/                    # TypeScript definitions
└── __tests__/               # Test files (unit & integration)
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_jira_task` | Get detailed task information with images/comments |
| `next_jira_task` | Find next task based on dependencies |
| `add_jira_issue` | Create issues with markdown support |
| `update_jira_task` | AI-powered task updates |
| `set_jira_task_status` | Change task status (batch support) |
| `expand_jira_task` | AI-generated subtask breakdown |
| `add_jira_comment` | Add comments with markdown |
| `get_jira_attachment` | Get attachments with text extraction |
| `remove_jira_task` | Delete tasks (batch support) |

## Authentication

### OAuth 2.0 (Claude)
- Stateless JWT-based implementation
- Automatic token refresh
- No external storage required

### Header-based (Cursor)
- Direct API token authentication
- Pass credentials via HTTP headers:
  - `x-atlassian-email`
  - `x-jira-api-token`
  - `x-jira-project`
  - `x-bitbucket-api-token` (optional)

## Development

### Scripts
```bash
npm run dev        # Development with hot reload
npm run build      # Build TypeScript
npm run test       # Run all tests
npm run test:unit  # Unit tests only
npm run test:e2e   # Integration tests
npm run lint       # ESLint
```

### Key Implementation Patterns

## API Endpoints

- `GET /health` - Health check
- `POST /mcp` - MCP protocol endpoint
- `GET /auth/.well-known/oauth-authorization-server` - OAuth discovery
- `GET /auth/authorize` - OAuth authorization
- `POST /auth/token` - Token exchange/refresh

## Docker Deployment

```bash
docker build -t cintra-taskmaster .
docker run -p 3000:3000 --env-file .env cintra-taskmaster
```