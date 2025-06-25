// Debug script to check LLM model selection from Campaign Settings Step
// Run this in the browser console after completing Step 2 (Campaign Settings)

console.log('🔍 Debugging LLM Model Selection...');

// Check if the global function exists
if (typeof window.__campaignStepData === 'function') {
    console.log('✅ Campaign step data function found');

    // Get the campaign data
    const campaignData = window.__campaignStepData();
    console.log('📋 Campaign step data:', campaignData);

    if (campaignData && campaignData.aiProvider) {
        console.log('✅ LLM Model found:', campaignData.aiProvider);
        console.log('🎯 This should be passed to the enrichment step');
    } else {
        console.log('❌ No aiProvider found in campaign data');
        console.log('🔍 Available keys:', Object.keys(campaignData || {}));
    }
} else {
    console.log('❌ Campaign step data function not found');
    console.log('🔍 Available window properties:', Object.keys(window).filter(key => key.includes('campaign')));
}

// Also check for any other LLM-related data in window
console.log('🔍 Checking for other LLM-related data in window...');
const llmKeys = Object.keys(window).filter(key =>
    key.toLowerCase().includes('llm') ||
    key.toLowerCase().includes('model') ||
    key.toLowerCase().includes('ai')
);
console.log('🔍 LLM-related window keys:', llmKeys);

// Instructions
console.log('\n📝 Instructions:');
console.log('1. Complete Step 2 (Campaign Settings) and select an AI model');
console.log('2. Run this script in the browser console');
console.log('3. Check if the LLM model selection is properly exposed');
console.log('4. If the aiProvider is found, the issue is elsewhere');
console.log('5. If not found, the Campaign Settings Step is not exposing the data correctly'); 