// WhatsApp API Debug Test
// This file tests the WhatsApp API endpoint directly

const WHATSAPP_API_BASE_URL = 'https://webhook.whatapi.in/webhook/68c51d1c0686f623b6e54f55';

// Test function to check API connectivity
const testWhatsAppAPI = async () => {
  console.log('🔍 Testing WhatsApp API Endpoint...');
  
  const testNumber = '7058779785'; // Replace with your test number
  const testMessage = 'Test message from ONDO system - API connectivity check';
  
  try {
    // Construct the API URL
    const apiUrl = `${WHATSAPP_API_BASE_URL}?number=91${testNumber}&message=${encodeURIComponent(testMessage)}`;
    
    console.log('📡 API URL:', apiUrl);
    console.log('📱 Target Number:', `+91${testNumber}`);
    console.log('💬 Message:', testMessage);
    
    // Make the API call
    console.log('⏳ Sending request...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Status Text:', response.statusText);
    
    // Try to get response text
    let responseText = '';
    try {
      responseText = await response.text();
      console.log('📄 Response Body:', responseText);
    } catch (textError) {
      console.log('⚠️ Could not read response body:', textError.message);
    }
    
    if (response.ok) {
      console.log('✅ API call successful!');
      console.log('📱 Check your WhatsApp for the test message');
      return { success: true, response: responseText };
    } else {
      console.log('❌ API call failed');
      console.log('🔍 Possible issues:');
      console.log('  - API endpoint might be down');
      console.log('  - Invalid API key or webhook URL');
      console.log('  - Network connectivity issues');
      console.log('  - Rate limiting');
      return { success: false, error: `${response.status}: ${response.statusText}`, response: responseText };
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('🔍 Possible issues:');
    console.log('  - No internet connection');
    console.log('  - CORS issues (if running in browser)');
    console.log('  - API endpoint unreachable');
    console.log('  - Firewall blocking the request');
    return { success: false, error: error.message };
  }
};

// Test with different message formats
const testMessageFormats = async () => {
  console.log('\n🧪 Testing different message formats...');
  
  const testCases = [
    {
      name: 'Simple Text',
      message: 'Hello from ONDO!'
    },
    {
      name: 'Text with Emojis',
      message: '🎉 Welcome to ONDO Company! 🚀'
    },
    {
      name: 'Multi-line Text',
      message: `Welcome to ONDO!
      
Your account has been created.
Please login to continue.`
    },
    {
      name: 'Text with Special Characters',
      message: 'User ID: abc123 | Email: test@example.com | Phone: +91-1234567890'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`💬 Message: ${testCase.message}`);
    
    const encodedMessage = encodeURIComponent(testCase.message);
    console.log(`🔗 Encoded: ${encodedMessage}`);
    
    // Check if encoding is working properly
    const decoded = decodeURIComponent(encodedMessage);
    console.log(`✅ Encoding test: ${decoded === testCase.message ? 'PASS' : 'FAIL'}`);
  }
};

// Test URL construction
const testURLConstruction = () => {
  console.log('\n🔧 Testing URL Construction...');
  
  const testData = {
    number: '7058779785',
    message: 'Test message with special chars: @#$%^&*()'
  };
  
  const url1 = `${WHATSAPP_API_BASE_URL}?number=91${testData.number}&message=${encodeURIComponent(testData.message)}`;
  console.log('🔗 Constructed URL:', url1);
  
  // Test URL length
  console.log('📏 URL Length:', url1.length);
  if (url1.length > 2048) {
    console.log('⚠️ URL might be too long for some systems');
  }
  
  // Test URL components
  try {
    const urlObj = new URL(url1);
    console.log('✅ URL is valid');
    console.log('🌐 Protocol:', urlObj.protocol);
    console.log('🏠 Host:', urlObj.host);
    console.log('📍 Pathname:', urlObj.pathname);
    console.log('🔍 Search params:', urlObj.searchParams.toString());
  } catch (error) {
    console.log('❌ Invalid URL:', error.message);
  }
};

// Main test runner
const runWhatsAppDebugTests = async () => {
  console.log('🚀 Starting WhatsApp Debug Tests...\n');
  
  // Test 1: URL Construction
  testURLConstruction();
  
  // Test 2: Message Formats
  await testMessageFormats();
  
  // Test 3: Actual API Call (uncomment to test)
  console.log('\n⚠️ To test actual API call, uncomment the line below:');
  console.log('// const result = await testWhatsAppAPI();');
  
  // Uncomment the next line to actually send a test message
  // const result = await testWhatsAppAPI();
  
  console.log('\n🎉 Debug tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Uncomment the API test line above to send actual message');
  console.log('2. Check your WhatsApp for test messages');
  console.log('3. Verify API credentials and endpoint');
  console.log('4. Check network connectivity');
};

// Export functions for use in other files
export { testWhatsAppAPI, testMessageFormats, testURLConstruction, runWhatsAppDebugTests };

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  console.log('WhatsApp Debug Test Module Loaded');
  console.log('Run runWhatsAppDebugTests() to start debugging');
}
