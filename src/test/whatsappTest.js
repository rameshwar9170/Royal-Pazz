// Test file for WhatsApp API functionality
import { sendWelcomeMessage, generateUserId, formatDate } from '../services/whatsappService';

// Test data matching your example
const testParticipant = {
  name: 'Test User',
  mobile: '7058779785',
  email: 'shiv@gmail.com',
  role: 'Sales Team',
  joiningDate: '2025-09-19'
};

// Test the WhatsApp service
const testWhatsAppService = async () => {
  console.log('🧪 Testing WhatsApp Service...');
  
  try {
    // Test user ID generation
    const userId = generateUserId(testParticipant);
    console.log('Generated User ID:', userId);
    
    // Test date formatting
    const formattedDate = formatDate(testParticipant.joiningDate);
    console.log('Formatted Date:', formattedDate);
    
    // Prepare participant data
    const participantData = {
      userId: userId,
      joiningDate: formattedDate,
      name: testParticipant.name,
      mobile: testParticipant.mobile,
      email: testParticipant.email,
      role: testParticipant.role,
      portalUrl: 'https://royal-pazz.vercel.app/login'
    };
    
    console.log('Participant Data:', participantData);
    
    // Test message sending (uncomment to actually send)
    // const result = await sendWelcomeMessage(participantData);
    // console.log('Message sent:', result);
    
    console.log('✅ WhatsApp service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for manual testing
export { testWhatsAppService };

// Auto-run test if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('WhatsApp Service Test Module Loaded');
  // Uncomment the line below to run the test automatically
  // testWhatsAppService();
}
