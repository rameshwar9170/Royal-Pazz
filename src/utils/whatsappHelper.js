// whatsappHelper.js - FIXED WhatsApp API Integration

/**
 * Sends WhatsApp confirmation message to participant after trainer confirms
 * @param {Object} participantData - Participant information
 * @param {string} participantData.name - Participant name
 * @param {string} participantData.mobile - Participant mobile number
 * @param {string} participantData.email - Participant email
 * @param {string} participantData.userId - Generated user ID
 * @param {string} participantData.joiningDate - Date of joining
 * @returns {Promise<boolean>} - Success status
 */
export const sendTrainingConfirmationMessage = async (participantData) => {
  try {
    console.log('=== SENDING WHATSAPP CONFIRMATION ===');
    console.log('Participant Data:', participantData);
    
    const webhookUrl = 'https://webhook.whatapi.in/webhook/68f31e091b9845c02d3c27c2';
    
    // Format mobile number - ensure it has country code
    let formattedMobile = participantData.mobile.toString().replace(/\D/g, '');
    
    // Always use participant's mobile number for sending (not hardcoded)
    if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
      formattedMobile = '91' + formattedMobile;
    }
    
    console.log('Formatted Mobile (Recipient):', formattedMobile);
    
    // Clean the data to avoid encoding issues
    const cleanName = participantData.name.trim();
    const cleanEmail = participantData.email.trim();
    const cleanUserId = participantData.userId.trim();
    const cleanJoiningDate = participantData.joiningDate.trim();
    const cleanMobile = participantData.mobile.toString().replace(/\D/g, '');
    
    // Construct message as per your API format
    // Format: ramsir,userId,joiningDate,name,mobile,email
    const messageParts = [
      'ramsir',
      cleanUserId,
      cleanJoiningDate,
      cleanName,
      cleanMobile,
      cleanEmail
    ];
    
    const message = messageParts.join(',');
    
    console.log('Message (before encoding):', message);
    
    // Properly encode the message
    const encodedMessage = encodeURIComponent(message);
    
    console.log('Message (after encoding):', encodedMessage);
    
    // Build full URL with query parameters - SEND TO PARTICIPANT'S NUMBER
    const fullUrl = `${webhookUrl}?number=${formattedMobile}&message=${encodedMessage}`;
    
    console.log('Full WhatsApp API URL:', fullUrl);
    
    // Send GET request to WhatsApp API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ WhatsApp confirmation sent successfully to:', formattedMobile);
      console.log('API Response:', data);
      return true;
    } else {
      console.error('❌ WhatsApp API failed. Status:', response.status);
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      
      // Still return false but don't throw error
      return false;
    }
  } catch (error) {
    console.error('❌ WhatsApp API Error:', error);
    console.error('Error details:', error.message);
    return false;
  }
};

/**
 * Generate simple User ID from name and mobile
 * @param {string} name - Participant name
 * @param {string} mobile - Mobile number
 * @returns {string} - Generated user ID
 */
export const generateUserId = (name, mobile) => {
  const cleanMobile = mobile.toString().replace(/\D/g, '');
  const namePrefix = name.substring(0, 3).toLowerCase().replace(/[^a-z]/g, '');
  const mobileLastFour = cleanMobile.slice(-4);
  const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${namePrefix}${mobileLastFour}${randomNum}`;
};
