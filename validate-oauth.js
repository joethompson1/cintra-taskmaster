#!/usr/bin/env node

/**
 * OAuth Configuration Validator
 * 
 * This script validates that all required OAuth environment variables
 * are properly configured before deployment.
 */

const fs = require('fs');
const path = require('path');

// Required OAuth environment variables
const REQUIRED_OAUTH_VARS = [
    'BASE_URL',
    'OAUTH_CALLBACK_URL',
    'ATLASSIAN_CLIENT_ID',
    'ATLASSIAN_CLIENT_SECRET',
    'JWT_SECRET'
];

// Optional OAuth environment variables (with defaults)
const OPTIONAL_OAUTH_VARS = [
    'MCP_CLIENT_ID',
    'MCP_CLIENT_SECRET'
];

function loadEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    const env = {};
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });
    }
    
    return env;
}

function validateOAuthConfig() {
    console.log('🔍 Validating OAuth configuration...\n');
    
    // Load environment variables from .env file and process.env
    const envFile = loadEnvFile();
    const allEnv = { ...envFile, ...process.env };
    
    let isValid = true;
    const errors = [];
    const warnings = [];
    
    // Check required variables
    for (const varName of REQUIRED_OAUTH_VARS) {
        const value = allEnv[varName];
        if (!value) {
            isValid = false;
            errors.push(`❌ Missing required environment variable: ${varName}`);
        } else {
            console.log(`✅ ${varName}: ${value.length > 20 ? value.substring(0, 20) + '...' : value}`);
        }
    }
    
    // Check optional variables
    for (const varName of OPTIONAL_OAUTH_VARS) {
        const value = allEnv[varName];
        if (!value) {
            warnings.push(`⚠️  Optional environment variable not set: ${varName} (will use ATLASSIAN_CLIENT_ID/SECRET)`);
        } else {
            console.log(`✅ ${varName}: ${value.length > 20 ? value.substring(0, 20) + '...' : value}`);
        }
    }
    
    console.log('\n📋 Validation Summary:');
    
    if (errors.length > 0) {
        console.log('\n🚨 ERRORS:');
        errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    // Additional checks
    const baseUrl = allEnv.BASE_URL;
    const callbackUrl = allEnv.OAUTH_CALLBACK_URL;
    
    if (baseUrl && callbackUrl) {
        if (!callbackUrl.startsWith(baseUrl)) {
            warnings.push(`⚠️  OAUTH_CALLBACK_URL should start with BASE_URL`);
        }
        
        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            warnings.push(`⚠️  BASE_URL contains localhost - ensure this matches your deployment URL`);
        }
    }
    
    if (isValid) {
        console.log('\n✅ OAuth configuration is valid!');
    } else {
        console.log('\n❌ OAuth configuration is invalid!');
        console.log('\n🔧 Please fix the errors above before deploying.');
        console.log('\nExample .env file:');
        console.log(`
BASE_URL=https://your-domain.com
OAUTH_CALLBACK_URL=https://your-domain.com/auth/callback
ATLASSIAN_CLIENT_ID=your-atlassian-client-id
ATLASSIAN_CLIENT_SECRET=your-atlassian-client-secret
JWT_SECRET=your-random-jwt-secret
        `);
        process.exit(1);
    }
}

// Run validation
validateOAuthConfig(); 