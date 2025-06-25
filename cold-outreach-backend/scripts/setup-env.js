#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps set up environment configuration for different environments
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
};

async function setupEnvironment() {
    console.log('🚀 Cold Outreach Backend - Environment Setup\n');

    const environment = await question('Which environment? (development/production): ');

    if (!['development', 'production'].includes(environment)) {
        console.log('❌ Invalid environment. Please choose development or production.');
        process.exit(1);
    }

    console.log(`\n⚙️  Setting up ${environment} environment...\n`);

    // Copy the appropriate template
    const templateFile = `config.${environment}.example`;
    const envFile = `.env.${environment}`;
    const defaultEnvFile = '.env';

    try {
        // Copy template to environment-specific file
        if (fs.existsSync(templateFile)) {
            fs.copyFileSync(templateFile, envFile);
            console.log(`✅ Created ${envFile} from template`);
        } else {
            console.log(`❌ Template file ${templateFile} not found`);
            process.exit(1);
        }

        // Also copy to default .env if it's development
        if (environment === 'development') {
            fs.copyFileSync(templateFile, defaultEnvFile);
            console.log(`✅ Created ${defaultEnvFile} for development`);
        }

        console.log('\n📝 Next steps:');
        console.log(`1. Edit ${envFile} with your actual configuration values`);
        console.log('2. Update DATABASE_URL with your PostgreSQL connection string');
        console.log('3. Update REDIS_URL if using external Redis');
        console.log('4. Set a strong JWT_SECRET (especially for production)');

        if (environment === 'production') {
            console.log('5. Configure production-specific security settings');
            console.log('6. Set up monitoring and error reporting');
        }

        console.log('\n🔐 Security Note:');
        console.log('- Never commit .env files to version control');
        console.log('- API keys are managed in the database, not environment files');
        console.log('- Use strong, unique secrets for production');

    } catch (error) {
        console.error('❌ Error setting up environment:', error.message);
        process.exit(1);
    }

    rl.close();
}

// Run the setup
setupEnvironment().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}); 