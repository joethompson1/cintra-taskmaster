// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// @ts-ignore
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
// @ts-ignore
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { setupMcpServer } from './server/mcpServer';
import { logger } from './utils/logger';
import './utils/datadog'; // Import Datadog initialization
import { oauthMiddleware } from './middleware/oauth';
import { createMCPOAuthRouter } from './middleware/mcp-oauth-endpoints';

const app = express();

// Configure CORS to allow MCP Inspector and other clients
const isLambda = !!process.env.AWS_EXECUTION_ENV;
const isDevelopment = process.env.NODE_ENV === 'development';

const corsOrigins = isDevelopment && !isLambda ? [
	// Development origins (only in local development)
	'http://localhost:6274', // MCP Inspector default port
	'http://localhost:5173', // Vite dev server
	'http://localhost:3001', // Common dev port
	'https://claude.ai',     // Claude web interface
	...(process.env.ALLOWED_ORIGINS?.split(',') || [])
] : [
	// Production/Lambda origins
	'https://claude.ai',     // Claude web interface
	...(process.env.ALLOWED_ORIGINS?.split(',') || [])
];

app.use(cors({
	origin: corsOrigins,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: [
		'Content-Type', 
		'Authorization', 
		'x-mcp-session-id', 
		'mcp-session-id', 
		'Origin', 
		'Accept',
		// Authentication headers
		'x-atlassian-email',
		'x-jira-api-token',
		'x-jira-project',
		'x-bitbucket-api-token',
		// OAuth headers
		'x-oauth-token',
		'x-cloud-id',
		'oauth-authenticated'
	]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount OAuth routes
app.use(createMCPOAuthRouter());

// Store both transports and session configs
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const sessionConfigs: { [sessionId: string]: any } = {};

// Extract credentials from headers
function extractCredentials(req: Request) {
	// Debug logging
	logger.info('🔍 Extracting credentials from request', {
		oauthAuthenticated: req.headers['oauth-authenticated'],
		hasJiraToken: !!req.headers['x-jira-api-token'],
		hasAtlassianEmail: !!req.headers['x-atlassian-email'],
		hasJiraProject: !!req.headers['x-jira-project']
	});
	
	// Check if this is OAuth authenticated
	if (req.headers['oauth-authenticated'] === 'true') {
		// OAuth authentication - use OAuth token for Jira API
		const oauthToken = req.headers['x-oauth-token'] as string;
		const cloudId = req.headers['x-cloud-id'] as string;
		const email = req.headers['x-atlassian-email'] as string;
		const project = req.headers['x-jira-project'] as string;
		
		logger.info('✅ Using OAuth authentication for session credentials');
		
		const credentials = {
			JIRA_API_URL: cloudId ? `https://api.atlassian.com/ex/jira/${cloudId}` : process.env.JIRA_API_URL,
			JIRA_EMAIL: email, // OAuth user's email from JWT token
			JIRA_API_TOKEN: oauthToken, // Use OAuth token as API token
			JIRA_PROJECT: project, // OAuth user's project from JWT token
			BITBUCKET_WORKSPACE: process.env.BITBUCKET_WORKSPACE,
			BITBUCKET_EMAIL: email, // Use same email for Bitbucket
			BITBUCKET_API_TOKEN: oauthToken, // Use same OAuth token for Bitbucket
			IS_OAUTH: true, // Flag to indicate OAuth authentication
		};
		
		logger.info('🔍 OAuth credentials extracted:', {
			hasJiraApiUrl: !!credentials.JIRA_API_URL,
			hasJiraToken: !!credentials.JIRA_API_TOKEN,
			hasJiraEmail: !!credentials.JIRA_EMAIL,
			hasJiraProject: !!credentials.JIRA_PROJECT,
			jiraApiUrl: credentials.JIRA_API_URL,
			jiraEmail: credentials.JIRA_EMAIL,
			jiraProject: credentials.JIRA_PROJECT,
			isOAuth: credentials.IS_OAUTH
		});
		
		return credentials;
	} else {
		// Header-based authentication (for Cursor/MCP clients with headers)
		// If headers are present, use them; otherwise use environment variables as fallback
		const hasHeaders = !!(req.headers['x-atlassian-email'] && req.headers['x-jira-api-token'] && req.headers['x-jira-project']);
		
		if (hasHeaders) {
			logger.info('✅ Using header-based authentication for session credentials');
		} else {
			logger.info('⚠️  No headers present, using environment variables as fallback');
		}
		
		return {
			JIRA_API_URL: process.env.JIRA_API_URL,
			JIRA_EMAIL: req.headers['x-atlassian-email'] as string || process.env.JIRA_EMAIL,
			JIRA_API_TOKEN: req.headers['x-jira-api-token'] as string || process.env.JIRA_API_TOKEN,
			JIRA_PROJECT: req.headers['x-jira-project'] as string || process.env.JIRA_PROJECT,
			BITBUCKET_WORKSPACE: process.env.BITBUCKET_WORKSPACE,
			BITBUCKET_EMAIL: req.headers['x-atlassian-email'] as string || process.env.BITBUCKET_EMAIL,
			BITBUCKET_API_TOKEN: req.headers['x-bitbucket-api-token'] as string || process.env.BITBUCKET_API_TOKEN,
			IS_OAUTH: false, // Flag to indicate non-OAuth authentication
			HAS_HEADERS: hasHeaders, // Flag to indicate if headers were present
		};
	}
}

// Handle POST requests for client-to-server communication
app.post('/mcp', oauthMiddleware.authenticateOAuth.bind(oauthMiddleware), async (req: Request, res: Response) => {
	logger.info('POST /mcp received', {
		contentType: req.headers['content-type'],
		accept: req.headers['accept'],
		method: req.body?.method,
		hasBody: !!req.body
	});
	try {
		// Check for existing session ID
		const sessionId = req.headers['mcp-session-id'] as string | undefined;
		let transport: StreamableHTTPServerTransport;

		if (sessionId && transports[sessionId]) {
			// Reuse existing transport
			transport = transports[sessionId];
			logger.info(`Reusing existing transport for session: ${sessionId}`);
			
			// Update session config with any new credentials from headers
			const credentials = extractCredentials(req);
			sessionConfigs[sessionId] = { ...sessionConfigs[sessionId], ...credentials };
		} else if (!sessionId && isInitializeRequest(req.body)) {
			// New initialization request
			logger.info('Creating new transport for initialization request');
			
			// Extract credentials from headers
			const credentials = extractCredentials(req);
			
			transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: () => randomUUID(),
				onsessioninitialized: (sessionId: string) => {
					// Store the transport and credentials by session ID
					transports[sessionId] = transport;
					sessionConfigs[sessionId] = credentials;
					logger.info(`Session initialized and stored: ${sessionId}`);
					logger.info(`Credentials configured for session: ${sessionId}`, {
						hasJiraToken: !!credentials.JIRA_API_TOKEN,
						jiraEmail: (credentials as any).JIRA_EMAIL || 'OAuth (not required)',
						jiraProject: (credentials as any).JIRA_PROJECT || 'OAuth (not required)',
						isOAuth: (credentials as any).IS_OAUTH || false
					});
				},
			});

			// Clean up transport when closed
			transport.onclose = () => {
				if (transport.sessionId) {
					delete transports[transport.sessionId];
					delete sessionConfigs[transport.sessionId];
					logger.info(`Session ${transport.sessionId} cleaned up`);
				}
			};

			// Create MCP server instance for this transport
			const server = new McpServer({
				name: 'cintra-taskmaster',
				version: '1.0.0'
			});

			// Setup tools and resources with access to session config
			setupMcpServer(server, () => sessionConfigs[transport.sessionId!]);

			// Connect to the MCP server
			await server.connect(transport);
			logger.info('MCP server connected to transport');
		} else {
			// Invalid request
			logger.info('Invalid request: no session ID and not an initialize request');
			logger.info('Request details:', {
				sessionId: sessionId,
				method: req.body?.method,
				isInitializeRequest: isInitializeRequest(req.body),
				requestBody: JSON.stringify(req.body, null, 2)
			});
			res.status(400).json({
				jsonrpc: '2.0',
				error: {
					code: -32000,
					message: 'Bad Request: No valid session ID provided',
				},
				id: null,
			});
			return;
		}

		// Handle the request
		logger.info(`Handling request for session: ${transport.sessionId}`);
		logger.info('About to call transport.handleRequest');
		try {
			await transport.handleRequest(req, res, req.body);
			logger.info('transport.handleRequest completed successfully');
		} catch (error) {
			logger.error('Error in transport.handleRequest:', error);
			throw error;
		}
	} catch (error) {
		logger.error('Error in POST /mcp:', error);
		if (!res.headersSent) {
			res.status(500).json({
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: 'Internal server error',
				},
				id: null,
			});
		}
	}
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: Request, res: Response) => {
	try {
		const sessionId = req.headers['mcp-session-id'] as string | undefined;
		logger.info(`Session request (${req.method}) for session: ${sessionId}`);
		
		if (!sessionId || !transports[sessionId]) {
			logger.info('Invalid or missing session ID');
			res.status(400).send('Invalid or missing session ID');
			return;
		}
		
		const transport = transports[sessionId];
		await transport.handleRequest(req, res);
	} catch (error) {
		logger.error(`Error in ${req.method} /mcp:`, error);
		if (!res.headersSent) {
			res.status(500).send('Internal server error');
		}
	}
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', oauthMiddleware.authenticateOAuth.bind(oauthMiddleware), handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', oauthMiddleware.authenticateOAuth.bind(oauthMiddleware), handleSessionRequest);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
	res.json({ 
		status: 'healthy', 
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		sessions: Object.keys(transports).length,
		oauth: {
			configured: oauthMiddleware.isConfigured(),
			discoveryUrl: '/.well-known/oauth-authorization-server'
		}
	});
});

// Root route handler for OAuth errors and basic info
app.get('/', (req: Request, res: Response) => {
	const { error, error_description } = req.query;
	
	if (error) {
		// Display OAuth error information
		res.status(400).json({
			error: 'oauth_error',
			error_type: error as string,
			error_description: error_description as string || 'OAuth flow failed',
			message: 'There was an error during the OAuth authentication process.',
			next_steps: [
				'Check your OAuth configuration in the MCP Inspector',
				'Ensure your Atlassian OAuth app is properly configured',
				'Verify your environment variables are set correctly'
			],
			support: {
				health_check: '/health',
				oauth_discovery: '/.well-known/oauth-authorization-server'
			}
		});
	} else {
		// Display basic server information
		res.json({
			name: 'Cintra-Taskmaster MCP Server',
			version: '1.0.0',
			status: 'running',
			endpoints: {
				health: '/health',
				mcp: '/mcp',
				oauth_discovery: '/.well-known/oauth-authorization-server'
			},
			authentication: {
				methods: ['OAuth 2.0', 'Header-based'],
				oauth_configured: oauthMiddleware.isConfigured()
			},
			message: 'This is an MCP server for Jira and Bitbucket task management.'
		});
	}
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// In Lambda environment, the server should bind to all interfaces
const host = process.env.AWS_EXECUTION_ENV ? '0.0.0.0' : 'localhost';

app.listen(PORT, host, () => {
	logger.info(`MCP HTTP server listening on ${host}:${PORT}`, {
		host,
		port: PORT,
		endpoints: {
			health: `http://${host}:${PORT}/health`,
			mcp: `http://${host}:${PORT}/mcp`
		}
	});
	
	// Log Lambda-specific information if running in Lambda
	if (process.env.AWS_EXECUTION_ENV) {
		logger.info('Running in AWS Lambda environment', {
			functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
			functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
			executionEnv: process.env.AWS_EXECUTION_ENV,
			awsRegion: process.env.AWS_REGION
		});
	}
});

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('SIGTERM received, shutting down gracefully');
	// Close all transports
	Object.values(transports).forEach(transport => {
		transport.close();
	});
	process.exit(0);
});

process.on('SIGINT', () => {
	logger.info('SIGINT received, shutting down gracefully');
	// Close all transports
	Object.values(transports).forEach(transport => {
		transport.close();
	});
	process.exit(0); 
});