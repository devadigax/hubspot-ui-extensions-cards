const axios = require('axios');

exports.main = async (context) => {
  const { parameters } = context;
  const { dealname, amount } = parameters;

  // Validate input: Deal name is usually the only strictly required property for a basic deal
  if (!dealname) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Missing required parameter: dealname'
      }
    };
  }

  try {
    // Get token to make API requests on behalf of your app
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;

    // Construct the properties payload
    const properties = {
      dealname: dealname
    };

    // Only add the amount if the user provided one
    if (amount) {
      properties.amount = amount;
    }

    // Create deal in HubSpot
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/deals',
      {
        properties: properties
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Deal created:', response.data.id);

    return {
      statusCode: 200,
      body: {
        success: true,
        dealId: response.data.id,
        message: 'Deal created successfully'
      }
    };
  } catch (error) {
    // Log the actual error for easier debugging in the HubSpot console
    console.error('Error creating deal:', error.message || error);

    const { response } = error;
    return {
      statusCode: (response && response.status) ? response.status : 500,
      body: {
        success: false,
        error: (response && response.data && response.data.message) 
            ? response.data.message 
            : 'Unknown error occurred while creating deal'
      }
    };
  }
};