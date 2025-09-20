// WhatsApp API Service for sending welcome messages to participants
const WHATSAPP_API_BASE_URL = 'https://webhook.whatapi.in/webhook/68c8001cbde42bbd90745a08';

/**
 * Sends a welcome message to a participant via WhatsApp
 * @param {Object} participantData - The participant's information
 * @param {string} participantData.userId - User ID (e.g., abc123)
 * @param {string} participantData.joiningDate - Joining date (e.g., 19/09/2025)
 * @param {string} participantData.name - Participant's name
 * @param {string} participantData.mobile - Mobile number (e.g., 7058779785)
 * @param {string} participantData.email - Email address
 * @param {string} participantData.role - Role (e.g., Sales Team)
 * @param {string} participantData.portalUrl - Company portal URL
 * @returns {Promise<boolean>} - Returns true if message sent successfully
 */
export const sendWelcomeMessage = async (participantData) => {
  try {
    console.log('🚀 Starting WhatsApp message send process...');
    console.log('Participant Data:', participantData);
    
    const {
      userId,
      joiningDate,
      name,
      mobile,
      email,
      role = 'Sales Team',
      portalUrl = 'https://royal-pazz.vercel.app/login'
    } = participantData;

    // Validate required fields
    if (!name || !mobile) {
      console.error('❌ Missing required fields: name and mobile are required');
      console.error('Name:', name, 'Mobile:', mobile);
      return false;
    }

    // Clean mobile number (remove any non-digits)
    const cleanMobile = mobile.toString().replace(/\D/g, '');
    console.log('📱 Original mobile:', mobile, 'Cleaned mobile:', cleanMobile);
    
    // Validate mobile number (should be 10 digits)
    if (cleanMobile.length !== 10) {
      console.error('❌ Invalid mobile number format:', mobile, 'Length:', cleanMobile.length);
      return false;
    }

    // Use the simple message format that works
    const welcomeMessage = `HTAMScompany,${userId},${joiningDate},${name},${cleanMobile},${email},${portalUrl}`;

    console.log('📝 Message to send:', welcomeMessage);

    // Construct the API URL with parameters
    const apiUrl = `${WHATSAPP_API_BASE_URL}?number=91${cleanMobile}&message=${encodeURIComponent(welcomeMessage)}`;

    console.log(`📤 Sending WhatsApp message to +91${cleanMobile}...`);
    console.log('🔗 Full API URL:', apiUrl);

    // Send the WhatsApp message
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Get response text for debugging
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      console.warn('⚠️ Could not read response text:', e.message);
    }

    console.log('📥 WhatsApp API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      ok: response.ok
    });

    if (response.ok) {
      console.log(`✅ Welcome message sent successfully to ${name} (+91${cleanMobile})`);
      return true;
    } else {
      console.error(`❌ Failed to send WhatsApp message: ${response.status} ${response.statusText}`);
      console.error('Response body:', responseText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    console.error('Error details:', error.message, error.stack);
    return false;
  }
};

/**
 * Sends a custom WhatsApp message
 * @param {string} mobile - Mobile number without country code
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} - Returns true if message sent successfully
 */
export const sendCustomMessage = async (mobile, message) => {
  try {
    // Validate inputs
    if (!mobile || !message) {
      console.error('Missing required fields: mobile and message are required');
      return false;
    }

    // Clean mobile number (remove any non-digits)
    const cleanMobile = mobile.toString().replace(/\D/g, '');
    
    // Validate mobile number (should be 10 digits)
    if (cleanMobile.length !== 10) {
      console.error('Invalid mobile number format:', mobile);
      return false;
    }

    const apiUrl = `${WHATSAPP_API_BASE_URL}?number=91${cleanMobile}&message=${encodeURIComponent(message)}`;

    console.log(`Sending custom WhatsApp message to +91${cleanMobile}...`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Get response text for debugging
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      console.warn('Could not read response text:', e.message);
    }

    console.log('WhatsApp API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.ok) {
      console.log(`✅ Custom message sent successfully to +91${cleanMobile}`);
      return true;
    } else {
      console.error(`❌ Failed to send custom WhatsApp message: ${response.status} ${response.statusText}`);
      console.error('Response body:', responseText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending custom WhatsApp message:', error);
    return false;
  }
};

/**
 * Generates a unique user ID based on employee data
 * @param {Object} employee - Employee data
 * @returns {string} - Generated user ID
 */
export const generateUserId = (employee) => {
  const namePrefix = employee.name.substring(0, 3).toLowerCase();
  const mobileLastFour = employee.mobile.slice(-4);
  const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${namePrefix}${mobileLastFour}${randomNum}`;
};

/**
 * Formats date to DD/MM/YYYY format
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  const dateObj = new Date(date);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Test function to verify WhatsApp API with provided parameters
 * Tests with: HTAMScompany,abc123,19/09/2025,name,7058779785,shiv@gmail.com,https://royal-pazz.vercel.app/login
 */
export const testWhatsAppAPI = async () => {
  console.log('🧪 Testing WhatsApp API with provided parameters...');
  
  const testData = {
    userId: 'abc123',
    joiningDate: '19/09/2025',
    name: 'name',
    mobile: '7058779785',
    email: 'shiv@gmail.com',
    role: 'Sales Team',
    portalUrl: 'https://royal-pazz.vercel.app/login'
  };

  console.log('Test Data:', testData);
  
  // Test the welcome message function
  const result = await sendWelcomeMessage(testData);
  
  if (result) {
    console.log('✅ WhatsApp API test successful!');
  } else {
    console.log('❌ WhatsApp API test failed!');
  }
  
  return result;
};

/**
 * Direct API test function that matches your exact URL format
 */
export const testDirectAPI = async () => {
  const testUrl = 'https://webhook.whatapi.in/webhook/68c8001cbde42bbd90745a08?number=919175514916&message=HTAMScompany,abc123,19/09/2025,name,7058779785,shiv@gmail.com,https://royal-pazz.vercel.app/login';
  
  console.log('🔗 Testing direct API call...');
  console.log('URL:', testUrl);
  
  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let responseText = '';
    try {
      responseText = await response.text();
    } catch (e) {
      console.warn('Could not read response text:', e.message);
    }

    console.log('Direct API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.ok) {
      console.log('✅ Direct API test successful!');
      return true;
    } else {
      console.error('❌ Direct API test failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in direct API test:', error);
    return false;
  }
};
