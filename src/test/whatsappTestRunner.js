// WhatsApp Integration Test Runner
// Run this file to test WhatsApp functionality

import { sendWelcomeMessage, generateUserId, formatDate, sendCustomMessage } from '../services/whatsappService.js';

// Test configuration - CHANGE THESE VALUES FOR YOUR TESTING
const TEST_CONFIG = {
  // Replace with your phone number (10 digits, no country code)
  testMobile: '7058779785',
  testName: 'Test User',
  testEmail: 'test@example.com',
  testRole: 'Sales Team'
};

// Test 1: User ID Generation
export const testUserIdGeneration = () => {
  console.log('🧪 Test 1: User ID Generation');
  
  const testEmployee = {
    name: TEST_CONFIG.testName,
    mobile: TEST_CONFIG.testMobile
  };
  
  const userId1 = generateUserId(testEmployee);
  const userId2 = generateUserId(testEmployee);
  
  console.log('Generated User ID 1:', userId1);
  console.log('Generated User ID 2:', userId2);
  console.log('✅ User IDs are unique:', userId1 !== userId2);
  
  return { userId1, userId2 };
};

// Test 2: Date Formatting
export const testDateFormatting = () => {
  console.log('\n🧪 Test 2: Date Formatting');
  
  const testDates = [
    '2025-09-13',
    '2025-12-25',
    new Date(),
    '2024-01-01'
  ];
  
  testDates.forEach(date => {
    const formatted = formatDate(date);
    console.log(`${date} → ${formatted}`);
  });
  
  console.log('✅ Date formatting test completed');
};

// Test 3: Welcome Message Structure
export const testMessageStructure = () => {
  console.log('\n🧪 Test 3: Welcome Message Structure');
  
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
  
  // This would be the message content (without actually sending)
  const messageContent = `Welcome to ONDO Company!  
We are pleased to welcome you as a valued member of our ${participantData.role}.  

🆔 User ID: ${participantData.userId}  
📅 Joining Date: ${participantData.joiningDate}  
👤 Name: ${participantData.name}  
📱 Mobile No: ${participantData.mobile}  
✉ Email ID: ${participantData.email}  

🌐 Company Portal: ${participantData.portalUrl}  

🔑 For your security, please log in and change your password after your first login.  

Wishing you great success in your journey with us.  
— ONDO Management Team`;
  
  console.log('📱 Generated Message:');
  console.log('-------------------');
  console.log(messageContent);
  console.log('-------------------');
  console.log('✅ Message structure test completed');
  
  return { participantData, messageContent };
};

// Test 4: API Endpoint Test (Dry Run)
export const testAPIEndpoint = async () => {
  console.log('\n🧪 Test 4: API Endpoint Test (Dry Run)');
  
  const testUrl = 'https://webhook.whatapi.in/webhook/68c51d1c0686f623b6e54f55';
  const testMessage = 'Test message from ONDO system';
  const testNumber = TEST_CONFIG.testMobile;
  
  const fullUrl = `${testUrl}?number=91${testNumber}&message=${encodeURIComponent(testMessage)}`;
  
  console.log('🔗 API Endpoint:', testUrl);
  console.log('📱 Test Number:', `+91${testNumber}`);
  console.log('📝 Test Message:', testMessage);
  console.log('🌐 Full URL:', fullUrl);
  
  try {
    console.log('⚠️  This is a dry run - no actual message will be sent');
    console.log('✅ API endpoint structure test completed');
    return true;
  } catch (error) {
    console.error('❌ API endpoint test failed:', error);
    return false;
  }
};

// Test 5: Send Actual WhatsApp Message (CAREFUL - THIS SENDS REAL MESSAGE)
export const testActualWhatsAppSend = async (confirmSend = false) => {
  console.log('\n🧪 Test 5: Actual WhatsApp Message Send');
  
  if (!confirmSend) {
    console.log('⚠️  Set confirmSend=true to actually send WhatsApp message');
    console.log('⚠️  Make sure TEST_CONFIG.testMobile is YOUR phone number');
    return false;
  }
  
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
  
  console.log('📱 Sending WhatsApp message to:', `+91${TEST_CONFIG.testMobile}`);
  console.log('👤 Participant:', participantData.name);
  
  try {
    const result = await sendWelcomeMessage(participantData);
    
    if (result) {
      console.log('✅ WhatsApp message sent successfully!');
      console.log('📱 Check your WhatsApp for the welcome message');
    } else {
      console.log('❌ WhatsApp message failed to send');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
};

// Test 6: Custom Message Test
export const testCustomMessage = async (confirmSend = false) => {
  console.log('\n🧪 Test 6: Custom Message Test');
  
  if (!confirmSend) {
    console.log('⚠️  Set confirmSend=true to actually send custom message');
    return false;
  }
  
  const customMessage = `🧪 Test Message from ONDO System
  
This is a test message to verify WhatsApp API integration.
  
Time: ${new Date().toLocaleString()}
System: HTAMS WhatsApp Integration
  
If you received this, the integration is working! ✅`;
  
  try {
    const result = await sendCustomMessage(TEST_CONFIG.testMobile, customMessage);
    
    if (result) {
      console.log('✅ Custom message sent successfully!');
    } else {
      console.log('❌ Custom message failed to send');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending custom message:', error);
    return false;
  }
};

// Run All Tests
export const runAllTests = async (sendRealMessages = false) => {
  console.log('🚀 Starting WhatsApp Integration Tests...\n');
  
  // Safe tests (no actual messages sent)
  testUserIdGeneration();
  testDateFormatting();
  testMessageStructure();
  await testAPIEndpoint();
  
  // Potentially send real messages (only if confirmed)
  if (sendRealMessages) {
    console.log('\n⚠️  REAL MESSAGE TESTS - WILL SEND ACTUAL WHATSAPP MESSAGES');
    await testCustomMessage(true);
    await testActualWhatsAppSend(true);
  } else {
    console.log('\n⚠️  Real message tests skipped. Call runAllTests(true) to send actual messages.');
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Update TEST_CONFIG with your phone number');
  console.log('2. Run: runAllTests(true) to send real messages');
  console.log('3. Test in Employee Management UI');
  console.log('4. Test in Trainer Dashboard UI');
};

// Auto-run safe tests when module loads
if (typeof window !== 'undefined') {
  console.log('WhatsApp Test Runner Loaded');
  console.log('Run runAllTests() for safe tests');
  console.log('Run runAllTests(true) to send real WhatsApp messages');
}
