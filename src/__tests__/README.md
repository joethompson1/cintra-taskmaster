# Test Organization

This directory contains all tests for the Cintra Taskmaster project, organized into two main categories:

## Directory Structure

```
src/__tests__/
├── unit/                   # Unit tests (fast, no external dependencies)
│   └── adf-to-markdown.test.ts
├── integration/            # Integration tests (require Jira credentials)
│   ├── e2e-integration.test.ts
│   └── update-task.integration.test.ts
├── setup.ts               # Jest setup configuration
├── README-E2E.md         # E2E testing documentation
└── README.md             # This file
```

## Test Scripts

- `npm run test:unit` - Run only unit tests (fast, CI-friendly)
- `npm run test:integration` - Run all integration tests (requires Jira credentials)
- `npm run test:e2e` - Run only the main E2E integration test
- `npm test` - Run all tests

## CI/CD Behavior

- **GitHub Actions CI**: Always runs unit tests, only runs integration tests when Jira credentials are available
- **Local Development**: Can run either unit or integration tests as needed

## Requirements

### Unit Tests
- No external dependencies
- Fast execution
- Run in all environments

### Integration Tests
- Require Jira instance access and AI services
- Need environment variables:
  - `JIRA_API_URL`
  - `JIRA_EMAIL`
  - `JIRA_API_TOKEN`
  - `JIRA_PROJECT`
  - `ANTHROPIC_API_KEY` (for AI-powered features)
- Create and clean up test tickets automatically
- Use safety measures to prevent affecting real work tickets 