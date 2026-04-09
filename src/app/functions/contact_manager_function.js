const axios = require('axios');

exports.main = async (context) => {
  const { parameters, crm } = context;
  const { email, firstname, lastname } = parameters;

  // Validate input
  if (!email || !firstname || !lastname) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Missing required parameters: email, firstname, lastname'
      }
    };
  }

  try {
    // Get token to make API requests on behalf of your app
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;

    // Create contact in HubSpot
    const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          properties: {
            email,
            firstname,
            lastname
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
    );

    console.log('Contact created:', response.data.id);

    return {
      statusCode: 200,
      body: {
        success: true,
        contactId: response.data.id,
        message: 'Contact created successfully'
    }
  };
  } catch (error) {
    console.error('Error creating contact.');

    const { response } = error;
    return {
      statusCode: (response && response.status) ? response.status : 500,
      body: {
        success: false,
        error: (response && response.data) ? response.data.message : 'Unknown error occurred'
      }
    };
  }
};