const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const execAsync = promisify(exec)

async function testFirecrawlTypeScript() {
    try {
        console.log('🔥 Testing Firecrawl TypeScript Service...')
        console.log('='.repeat(50))

        // Step 1: Compile just the firecrawl service
        console.log('📦 Compiling TypeScript files...')

        const compileCmd = 'npx tsc --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --experimentalDecorators --emitDecoratorMetadata --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --isolatedModules false --noImplicitAny false --strict false src/services/enrichment/firecrawlService.ts src/services/enrichment/apiConfigurationService.ts src/config/database.ts src/utils/errors.ts --outDir ./dist --moduleResolution node'

        try {
            await execAsync(compileCmd)
            console.log('✅ TypeScript compilation successful')
        } catch (error) {
            console.log('⚠️  Compilation warnings (continuing anyway):', error.message.substring(0, 200))
        }

        // Step 2: Create a test script
        const testScript = `
const { FirecrawlService } = require('./dist/src/services/enrichment/firecrawlService.js')

async function runTest() {
    try {
        console.log('🔥 Testing compiled Firecrawl service...')
        
        // Test basic scraping
        console.log('📤 Testing website scraping...')
        const result = await FirecrawlService.scrapeCompanyWebsite('https://example.com')
        
        console.log('✅ Scraping successful!')
        console.log('📊 Results:')
        console.log('- Title:', result.title)
        console.log('- Content length:', result.content?.length || 0)
        console.log('- Markdown length:', result.markdown?.length || 0)
        console.log('- Industry:', result.businessInfo?.industry || 'None detected')
        console.log('- URL:', result.url)
        
        return true
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        return false
    }
}

runTest().then(success => {
    process.exit(success ? 0 : 1)
}).catch(error => {
    console.error('❌ Test error:', error)
    process.exit(1)
})
`

        // Write test script
        fs.writeFileSync('./test-firecrawl-compiled.js', testScript)
        console.log('📝 Created test script')

        // Step 3: Run the test
        console.log('🚀 Running Firecrawl service test...')

        try {
            const { stdout, stderr } = await execAsync('node test-firecrawl-compiled.js')
            console.log(stdout)
            if (stderr) {
                console.log('Warnings:', stderr)
            }
            console.log('✅ TypeScript Firecrawl service test passed!')
        } catch (error) {
            console.error('❌ TypeScript test failed:', error.message)
            if (error.stdout) console.log('Output:', error.stdout)
            if (error.stderr) console.log('Errors:', error.stderr)
        }

        // Cleanup
        try {
            fs.unlinkSync('./test-firecrawl-compiled.js')
            console.log('🧹 Cleaned up test files')
        } catch (e) {
            // Ignore cleanup errors
        }

        console.log('\n' + '='.repeat(50))
        console.log('🎉 Firecrawl TypeScript test completed!')

    } catch (error) {
        console.error('❌ Test script failed:', error)
    }
}

// Run if called directly
if (require.main === module) {
    testFirecrawlTypeScript()
}

module.exports = { testFirecrawlTypeScript } 