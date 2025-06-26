const { extractDomainFromEmail, extractCompanyWebsiteFromEmail, isFreeEmailProvider } = require('../dist/utils/emailHelpers');

/**
 * Test script to verify domain extraction functionality
 */
async function testDomainExtraction() {
    console.log('🧪 Testing Domain Extraction Functionality\n');

    // Test cases
    const testEmails = [
        // Valid business emails
        'rob@suman.com',
        'sarah@shopify.com',
        'john@stripe.com',
        'mike@builtwith.com',
        'info@microsoft.com',
        'contact@apple.com',
        'support@www.tesla.com',

        // Free email providers (should be filtered)
        'user@gmail.com',
        'test@yahoo.com',
        'person@hotmail.com',
        'someone@outlook.com',
        'anna@icloud.com',
        'bob@protonmail.com',
        'charlie@mail.ru',
        'diana@qq.com',

        // Invalid emails
        'invalid-email',
        'no-at-sign.com',
        '@nodomain.com',
        'user@',
        '',
        null
    ];

    console.log('1️⃣ Testing extractDomainFromEmail function:');
    console.log('='.repeat(50));

    testEmails.forEach(email => {
        try {
            const domain = extractDomainFromEmail(email);
            const status = domain ? '✅' : '❌';
            const result = domain || 'FILTERED/INVALID';
            console.log(`   ${status} ${email || 'null'} → ${result}`);
        } catch (error) {
            console.log(`   ❌ ${email || 'null'} → ERROR: ${error.message}`);
        }
    });

    console.log('\n2️⃣ Testing extractCompanyWebsiteFromEmail function:');
    console.log('='.repeat(50));

    testEmails.slice(0, 8).forEach(email => {
        try {
            const website = extractCompanyWebsiteFromEmail(email);
            const status = website ? '✅' : '❌';
            const result = website || 'FILTERED/INVALID';
            console.log(`   ${status} ${email} → ${result}`);
        } catch (error) {
            console.log(`   ❌ ${email} → ERROR: ${error.message}`);
        }
    });

    console.log('\n3️⃣ Testing isFreeEmailProvider function:');
    console.log('='.repeat(50));

    testEmails.slice(0, 12).forEach(email => {
        try {
            const isFree = isFreeEmailProvider(email);
            const status = '🔍';
            console.log(`   ${status} ${email || 'null'} → ${isFree ? 'FREE PROVIDER' : 'BUSINESS EMAIL'}`);
        } catch (error) {
            console.log(`   ❌ ${email || 'null'} → ERROR: ${error.message}`);
        }
    });

    console.log('\n4️⃣ Expected Behavior Summary:');
    console.log('='.repeat(50));
    console.log('✅ Business emails should extract clean domains (rob@suman.com → suman.com)');
    console.log('✅ www. prefixes should be removed (support@www.tesla.com → tesla.com)');
    console.log('❌ Free email providers should be filtered out (user@gmail.com → null)');
    console.log('❌ Invalid emails should return null');
    console.log('✅ Company websites should be generated as https://www.{domain}');

    console.log('\n🎯 Test completed! Check the results above to verify correct functionality.');
}

// Run the test
testDomainExtraction().catch(console.error); 