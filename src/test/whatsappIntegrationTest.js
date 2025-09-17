// Comprehensive WhatsApp Integration Test
import { sendWelcomeMessage, sendCustomMessage, generateUserId, formatDate } from '../services/whatsappService.js';

// Test configuration
const TEST_CONFIG = {
  testMobile: '7058779785', // Replace with your test number
  testName: 'Test User',
  testEmail: 'test@example.com',
  testRole: 'Sales Team'
};

// Test 1: Simple message test
export const testSimpleMessage = async () => {
  console.log('🧪 Test 1: Simple Message');
  
  const testMessage = 'Hello from ONDO! This is a test message.';
  
  try {
    const result = await sendCustomMessage(TEST_CONFIG.testMobile, testMessage);
    
    if (result) {
      console.log('✅ Simple message test PASSED');
      return true;
    } else {
      console.log('❌ Simple message test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Simple message test ERROR:', error);
    return false;
  }
};

// Test 2: Welcome message test
export const testWelcomeMessage = async () => {
  console.log('\n🧪 Test 2: Welcome Message');
  
  const userId = generateUserId({ name: TEST_CONFIG.testName, mobile: TEST_CONFIG.testMobile });
  const participantData = {
    userId: userId,
    joiningDate: formatDate(new Date()),
    name: TEST_CONFIG.testName,
    mobile: TEST_CONFIG.testMobile,
    email: TEST_CONFIG.testEmail,
    role: TEST_CONFIG.testRole,
    portalUrl: 'https://royal-pazz.vercel.app/login'
  };
  
  console.log('Participant Data:', participantData);
  
  try {
    const result = await sendWelcomeMessage(participantData);
    
    if (result) {
      console.log('✅ Welcome message test PASSED');
      return true;
    } else {
      console.log('❌ Welcome message test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Welcome message test ERROR:', error);
    return false;
  }
};

// Test 3: Invalid mobile number test
export const testInvalidMobile = async () => {
  console.log('\n🧪 Test 3: Invalid Mobile Number Handling');
  
  const invalidNumbers = ['123', '12345678901', 'abc1234567', ''];
  
  for (const invalidNumber of invalidNumbers) {
    console.log(`Testing invalid number: "${invalidNumber}"`);
    
    try {
      const result = await sendCustomMessage(invalidNumber, 'Test message');
      
      if (!result) {
        console.log(`✅ Correctly rejected invalid number: ${invalidNumber}`);
      } else {
        console.log(`❌ Should have rejected invalid number: ${invalidNumber}`);
        return false;
      }
    } catch (error) {
      console.log(`✅ Correctly threw error for invalid number: ${invalidNumber}`);
    }
  }
  
  console.log('✅ Invalid mobile number test PASSED');
  return true;
};

// Test 4: Message encoding test
export const testMessageEncoding = async () => {
  console.log('\n🧪 Test 4: Message Encoding');
  
  const specialMessage = `Test message with special characters:
  
🎉 Emojis: 🚀 ✅ ❌ 📱
Special chars: @#$%^&*()
Line breaks and spaces
Numbers: 123456
Email: test@example.com
URL: https://example.com`;
  
  try {
    const result = await sendCustomMessage(TEST_CONFIG.testMobile, specialMessage);
    
    if (result) {
      console.log('✅ Message encoding test PASSED');
      return true;
    } else {
      console.log('❌ Message encoding test FAILED');
      return false;
    }
  } catch (error) {
    console.error('❌ Message encoding test ERROR:', error);
    return false;
  }
};

// Test 5: Rate limiting test (send multiple messages)
export const testRateLimiting = async () => {
  console.log('\n🧪 Test 5: Rate Limiting (Multiple Messages)');
  
  const messages = [
    'Message 1 - Rate limit test',
    'Message 2 - Rate limit test',
    'Message 3 - Rate limit test'
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < messages.length; i++) {
    console.log(`Sending message ${i + 1}/${messages.length}`);
    
    try {
      const result = await sendCustomMessage(TEST_CONFIG.testMobile, messages[i]);
      
      if (result) {
        successCount++;
      }
      
      // Wait 2 seconds between messages to avoid rate limiting
      if (i < messages.length - 1) {
        console.log('Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error sending message ${i + 1}:`, error);
    }
  }
  
  console.log(`✅ Rate limiting test completed: ${successCount}/${messages.length} messages sent`);
  return successCount > 0;
};

// Main test runner
export const runWhatsAppIntegrationTests = async (includeRealMessages = false) => {
  console.log('🚀 Starting WhatsApp Integration Tests...\n');
  console.log(`📱 Test Number: +91${TEST_CONFIG.testMobile}`);
  console.log(`⚠️ Real messages will ${includeRealMessages ? 'BE SENT' : 'NOT be sent'}`);
  console.log('=' .repeat(50));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Test invalid mobile numbers (safe test)
  results.total++;
  if (await testInvalidMobile()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  if (includeRealMessages) {
    // Test simple message
    results.total++;
    if (await testSimpleMessage()) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Test welcome message
    results.total++;
    if (await testWelcomeMessage()) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Test message encoding
    results.total++;
    if (await testMessageEncoding()) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Test rate limiting (optional)
    const testRateLimit = confirm('Do you want to test rate limiting? (This will send 3 messages)');
    if (testRateLimit) {
      results.total++;
      if (await testRateLimiting()) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
  } else {
    console.log('\n⚠️ Skipping real message tests. Set includeRealMessages=true to send actual messages.');
  }
  
  // Show results
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 Test Results:');
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📊 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (includeRealMessages && results.passed > 0) {
    console.log('\n📱 Check your WhatsApp for test messages!');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Update TEST_CONFIG.testMobile with your phone number');
  console.log('2. Run: runWhatsAppIntegrationTests(true) to send real messages');
  console.log('3. Check browser console for detailed logs');
  console.log('4. Test in your Employee Management and Trainer Dashboard');
  
  return results;
};

// Auto-run safe tests when module loads
if (typeof window !== 'undefined') {
  console.log('WhatsApp Integration Test Module Loaded');
  console.log('Available functions:');
  console.log('- runWhatsAppIntegrationTests() - Safe tests only');
  console.log('- runWhatsAppIntegrationTests(true) - Include real message tests');
  console.log('- testSimpleMessage() - Send a simple test message');
  console.log('- testWelcomeMessage() - Send a welcome message');
}
