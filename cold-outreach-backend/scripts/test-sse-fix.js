const { SSEService } = require('../dist/services/sseService');

/**
 * Test SSE Service with proper userId
 */
async function testSSEWithUserId() {
    console.log('🧪 Testing SSE Service with correct userId...\n');

    const sseService = SSEService.getInstance();
    const testUserId = 'default-user';

    // Test 1: Check initial stats
    console.log('📊 Initial SSE Stats:');
    const initialStats = sseService.getStats();
    console.log(JSON.stringify(initialStats, null, 2));

    // Test 2: Send a test job progress update
    console.log('\n📡 Sending test job progress update...');
    sseService.sendJobProgressUpdate(testUserId, {
        jobId: 'test-123',
        jobType: 'enrichment',
        status: 'completed',
        progress: 100,
        totalProspects: 2,
        completedProspects: 2,
        failedProspects: 0,
        prospects: []
    });
    console.log('✅ Job progress update sent');

    // Test 3: Send a test prospect enrichment update
    console.log('\n📡 Sending test prospect enrichment update...');
    sseService.sendProspectEnrichmentUpdate(testUserId, {
        prospectId: '123',
        status: 'completed',
        progress: 100,
        message: 'Test prospect enrichment completed'
    });
    console.log('✅ Prospect enrichment update sent');

    // Test 4: Check final stats
    console.log('\n📊 Final SSE Stats:');
    const finalStats = sseService.getStats();
    console.log(JSON.stringify(finalStats, null, 2));

    console.log('\n🎉 SSE Service test completed!');
    console.log('💡 Note: To see actual connections, you need to open the frontend and connect to /api/jobs/stream/default-user');
}

testSSEWithUserId().catch(console.error); 