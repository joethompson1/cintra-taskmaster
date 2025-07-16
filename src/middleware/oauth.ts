import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { logger } from '../utils/logger';
import { statelessTokenManager } from '../utils/jwt-token-storage';
// @ts-ignore
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// OAuth configuration
interface OAuthConfig {
    authorizationUrl: string;
    tokenUrl: string;
    revocationUrl: string;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scopes: string[];
}

// State store for CSRF protection
interface StateStore {
    [state: string]: {
        sessionId: string;
        createdAt: number;
    };
}

const stateStore: StateStore = {};

// Clean up expired states periodically
setInterval(() => {
    const now = Date.now();
    Object.entries(stateStore).forEach(([state, data]) => {
        if (now - data.createdAt > 600000) { // 10 minutes
            delete stateStore[state];
        }
    });
}, 60000); // Run every minute

export class AtlassianOAuthMiddleware {
    private config: OAuthConfig;

    constructor() {
        this.config = {
            authorizationUrl: 'https://auth.atlassian.com/authorize',
            tokenUrl: 'https://auth.atlassian.com/oauth/token',
            revocationUrl: 'https://auth.atlassian.com/oauth/token/revoke',
            clientId: process.env.ATLASSIAN_CLIENT_ID || '',
            clientSecret: process.env.ATLASSIAN_CLIENT_SECRET || '',
            callbackUrl: process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/auth/callback',
            scopes: [
                'read:jira-work',
                'write:jira-work',
                'read:jira-user',
                'offline_access' // For refresh tokens
            ]
        };

        if (!this.config.clientId || !this.config.clientSecret) {
            logger.warn('Atlassian OAuth credentials not configured. OAuth will be disabled.');
        }
    }

    /**
     * Generate authorization URL for OAuth flow
     */
    getAuthorizationUrl(sessionId: string): string {
        const state = crypto.randomBytes(32).toString('hex');
        
        // Store state for CSRF protection
        stateStore[state] = {
            sessionId,
            createdAt: Date.now()
        };

        const params = new URLSearchParams({
            audience: 'api.atlassian.com',
            client_id: this.config.clientId,
            scope: this.config.scopes.join(' '),
            redirect_uri: this.config.callbackUrl,
            state: state,
            response_type: 'code',
            prompt: 'consent'
        });

        return `${this.config.authorizationUrl}?${params.toString()}`;
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    async handleCallback(code: string, state: string): Promise<{ sessionId: string; tokens: any }> {
        // Verify state
        const stateData = stateStore[state];
        if (!stateData) {
            throw new Error('Invalid state parameter');
        }

        // Clean up used state
        delete stateStore[state];

        try {
            // Exchange code for tokens
            const response = await axios.post(this.config.tokenUrl, {
                grant_type: 'authorization_code',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                code: code,
                redirect_uri: this.config.callbackUrl
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const tokens = response.data;

            // Get accessible resources (Jira sites)
            const resourcesResponse = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                    'Accept': 'application/json'
                }
            });

            const resources = resourcesResponse.data;
            const cloudId = resources[0]?.id; // Use first available site

            // For OAuth, we only need the tokens and cloudId
            // Email and other user info are not required for API calls
            const userId = `oauth_user_${Date.now()}`;

            return {
                sessionId: stateData.sessionId,
                tokens: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: Date.now() + (tokens.expires_in * 1000),
                    cloudId: cloudId,
                    userId: userId
                }
            };
        } catch (error) {
            logger.error('Error exchanging code for tokens:', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     * Note: For stateless JWT approach, refreshing is handled in the OAuth endpoints
     */
    async refreshAccessToken(userId: string): Promise<string> {
        // This method is no longer needed for stateless approach
        // Refresh logic is handled directly in the OAuth token endpoint
        throw new Error('Refresh token logic moved to OAuth endpoints for stateless approach');
    }

    /**
     * Revoke tokens
     * Note: For stateless JWT approach, revocation is handled in the OAuth endpoints
     */
    async revokeTokens(userId: string): Promise<void> {
        // This method is no longer needed for stateless approach
        // Revocation logic is handled directly in the OAuth revoke endpoint
        logger.debug('Token revocation handled by OAuth endpoints in stateless approach');
    }

    /**
     * Middleware to extract OAuth tokens and convert to session config
     * Defaults to OAuth authentication but falls back to header-based auth if headers are present
     */
    async authenticateOAuth(req: Request, res: Response, next: NextFunction) {
        // Debug logging
        logger.info('OAuth middleware called', {
            method: req.method,
            url: req.url,
            hasAuthHeader: !!req.headers.authorization,
            sessionId: req.headers['mcp-session-id'],
            requestMethod: req.body?.method,
            isInitialize: isInitializeRequest(req.body)
        });
        
        // Check if required headers are present for header-based authentication
        // This takes priority over OAuth if headers are provided
        const hasHeaderAuth = this.hasRequiredHeaders(req);
        const isMcpEndpoint = req.url === '/mcp' || req.url.startsWith('/mcp?');
        
        logger.info('Header authentication check', {
            hasHeaderAuth,
            isMcpEndpoint,
            headers: {
                'x-atlassian-email': !!req.headers['x-atlassian-email'],
                'x-jira-api-token': !!req.headers['x-jira-api-token'],
                'x-jira-project': !!req.headers['x-jira-project']
            }
        });
        
        if (hasHeaderAuth) {
            // Headers are present, use header-based authentication
            logger.info('✅ Using header-based authentication (headers provided)');
            req.headers['oauth-authenticated'] = 'false'; // Mark as non-OAuth
            return next();
        }
        
        // No headers present, fall back to OAuth authentication (default behavior)
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        const isInitialize = isInitializeRequest(req.body);
        
        logger.info('🔐 No headers provided, using OAuth authentication (default)');
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Allow non-MCP initialize requests to pass through without OAuth
            // but require OAuth for all other requests (including MCP endpoints)
            if (isInitialize && !sessionId && !isMcpEndpoint) {
                logger.info('✅ Allowing non-MCP initialize request without OAuth (will trigger OAuth flow later)');
                req.headers['oauth-authenticated'] = 'false'; // Mark as non-OAuth
                return next();
            }
            
            // Return 401 with WWW-Authenticate header to trigger OAuth flow
            const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
            const discoveryUrl = `/.well-known/oauth-authorization-server`;
            const authUrl = `${baseUrl}/auth/authorize`;
            
            if (isMcpEndpoint) {
                logger.info('🔐 MCP endpoint requires OAuth authentication - returning 401 to trigger OAuth flow');
            } else {
                logger.info('❌ No OAuth token provided, returning 401');
            }
            
            return res.status(401).set({
                'WWW-Authenticate': `Bearer realm="MCP Server", authorization_uri="${authUrl}"`,
                'Content-Type': 'application/json'
            }).json({
                error: 'unauthorized',
                error_description: 'OAuth authentication required',
                authorization_uri: authUrl,
                oauth_discovery_uri: discoveryUrl
            });
        }

        const token = authHeader.substring(7);
        
        try {
            // Decode the JWT token to get Atlassian credentials (no storage lookup needed!)
            const tokenData = statelessTokenManager.verifyMCPToken(token);
            
            logger.info('🔍 OAuth token verification result:', {
                tokenExists: !!tokenData,
                hasAtlassianToken: !!tokenData?.atlassianAccessToken,
                hasEmail: !!tokenData?.email,
                hasCloudId: !!tokenData?.cloudId,
                hasJiraProject: !!tokenData?.jiraProject,
                tokenDataKeys: tokenData ? Object.keys(tokenData) : []
            });
            
            if (!tokenData) {
                logger.error('❌ OAuth token verification failed - token is invalid or expired');
                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            if (!tokenData.atlassianAccessToken) {
                logger.error('❌ OAuth token missing atlassianAccessToken field');
                return res.status(401).json({ error: 'Invalid token - missing access token' });
            }

            // Add OAuth-derived credentials to request headers
            req.headers['x-oauth-token'] = tokenData.atlassianAccessToken;
            req.headers['x-cloud-id'] = tokenData.cloudId;
            req.headers['oauth-authenticated'] = 'true';
            
            // Add email and project from JWT token if available
            if (tokenData.email) {
                req.headers['x-atlassian-email'] = tokenData.email;
            }
            if (tokenData.jiraProject) {
                req.headers['x-jira-project'] = tokenData.jiraProject;
            }

            logger.info('✅ OAuth headers set successfully', {
                hasEmail: !!req.headers['x-atlassian-email'],
                hasToken: !!req.headers['x-oauth-token'],
                hasCloudId: !!req.headers['x-cloud-id'],
                hasProject: !!req.headers['x-jira-project'],
                isOAuthAuthenticated: req.headers['oauth-authenticated'] === 'true',
                email: tokenData.email ? `${tokenData.email}` : 'not provided',
                project: tokenData.jiraProject ? `${tokenData.jiraProject}` : 'not provided'
            });

            next();
        } catch (error) {
            logger.error('OAuth authentication error:', error);
            return res.status(401).json({ error: 'Authentication failed' });
        }
    }

    /**
     * Check if required headers are present for header-based authentication
     */
    private hasRequiredHeaders(req: Request): boolean {
        const requiredHeaders = [
            'x-atlassian-email',
            'x-jira-api-token',
            'x-jira-project'
        ];
        
        // Check if all required headers are present and not empty
        return requiredHeaders.every(header => {
            const value = req.headers[header];
            return value && typeof value === 'string' && value.trim() !== '';
        });
    }

    /**
     * Get tokens for a user
     * Note: For stateless JWT approach, tokens are not stored
     */
    async getTokens(userId: string) {
        // Tokens are not stored in stateless approach - they're encoded in JWTs
        logger.debug('getTokens() called but tokens are not stored in stateless approach');
        return null;
    }

    /**
     * Get all tokens (for searching)
     * Note: For stateless JWT approach, tokens are not stored
     */
    getAllTokens() {
        // Tokens are not stored in stateless approach - they're encoded in JWTs
        logger.debug('getAllTokens() called but tokens are not stored in stateless approach');
        return {};
    }

    /**
     * Check if OAuth is properly configured
     */
    isConfigured(): boolean {
        return !!(this.config.clientId && this.config.clientSecret);
    }
}

export const oauthMiddleware = new AtlassianOAuthMiddleware(); 