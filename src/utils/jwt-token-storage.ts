import * as crypto from 'crypto';
import { logger } from './logger';

/**
 * Stateless JWT-based token approach for serverless deployments
 * No external storage needed - all data is encoded in the token
 */

interface JWTPayload {
    userId: string;
    atlassianAccessToken: string;
    atlassianRefreshToken?: string;
    cloudId?: string;
    email?: string;
    jiraProject?: string;
    expiresAt: number;
    iat: number; // issued at
    codeChallenge?: string;
    codeChallengeMethod?: string;
}

export class StatelessTokenManager {
    private secret: string;

    constructor() {
        this.secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        if (this.secret === 'default-secret-change-in-production') {
            logger.warn('Using default JWT secret. Set JWT_SECRET environment variable for production.');
        }
    }

    /**
     * Create a stateless MCP token that contains all necessary data
     */
    createMCPToken(data: {
        userId: string;
        atlassianAccessToken: string;
        atlassianRefreshToken?: string;
        cloudId?: string;
        email?: string;
        jiraProject?: string;
        expiresAt: number;
        codeChallenge?: string;
        codeChallengeMethod?: string;
    }): string {
        const payload: JWTPayload = {
            ...data,
            iat: Date.now()
        };

        // Simple JWT-like encoding (in production, use a proper JWT library)
        const header = { alg: 'HS256', typ: 'JWT' };
        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
        
        const signature = this.sign(`${encodedHeader}.${encodedPayload}`);
        
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    /**
     * Decode and verify an MCP token
     */
    verifyMCPToken(token: string): JWTPayload | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }

            const [encodedHeader, encodedPayload, signature] = parts;
            
            // Verify signature
            const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);
            if (signature !== expectedSignature) {
                logger.warn('Invalid token signature');
                return null;
            }

            // Decode payload
            const payload: JWTPayload = JSON.parse(this.base64UrlDecode(encodedPayload));
            
            // Check expiry
            if (Date.now() >= payload.expiresAt) {
                logger.debug('Token expired');
                return null;
            }

            return payload;
        } catch (error) {
            logger.error('Error verifying token:', error);
            return null;
        }
    }

    /**
     * Extract Atlassian tokens from MCP token
     */
    getAtlassianTokens(mcpToken: string): {
        accessToken: string;
        refreshToken?: string;
        cloudId?: string;
        email?: string;
        jiraProject?: string;
    } | null {
        const payload = this.verifyMCPToken(mcpToken);
        if (!payload) {
            return null;
        }

        return {
            accessToken: payload.atlassianAccessToken,
            refreshToken: payload.atlassianRefreshToken,
            cloudId: payload.cloudId,
            email: payload.email,
            jiraProject: payload.jiraProject
        };
    }

    private base64UrlEncode(str: string): string {
        return Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    private base64UrlDecode(str: string): string {
        // Add padding if needed
        const padded = str + '==='.slice(0, (4 - str.length % 4) % 4);
        return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    }

    private sign(data: string): string {
        return crypto
            .createHmac('sha256', this.secret)
            .update(data)
            .digest('base64url');
    }
}

// Singleton instance
export const statelessTokenManager = new StatelessTokenManager(); 