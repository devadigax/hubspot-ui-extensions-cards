const axios = require('axios');

exports.main = async (context) => {
  // FIX: Read the dealId from the parameters sent by the frontend
  const dealId = context.parameters.dealId;

  if (!dealId) {
    return {
      statusCode: 400,
      body: { 
        success: false, 
        error: 'No Deal ID found. Ensure this card is placed on a Deal record.' 
      }
    };
  }

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Step 1: Get the associated line item IDs for this deal
    const associationsResponse = await axios.get(
      `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/line_items`,
      { headers }
    );

    const lineItemIds = associationsResponse.data.results.map(assoc => assoc.toObjectId);

    if (lineItemIds.length === 0) {
      return { 
        statusCode: 200, 
        body: { success: true, lineItems: [] } 
      };
    }

    // Step 2: Fetch the properties for the associated line items
    const batchResponse = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/line_items/batch/read',
      {
        inputs: lineItemIds.map(id => ({ id: id.toString() })),
        properties: ['name', 'price', 'quantity', 'amount'] 
      },
      { headers }
    );

    const formattedLineItems = batchResponse.data.results.map(item => ({
      id: item.id,
      name: item.properties.name || 'Unnamed Line Item',
      price: item.properties.price || '0.00',
      quantity: item.properties.quantity || '0',
      amount: item.properties.amount || '0.00'
    }));

    return {
      statusCode: 200,
      body: {
        success: true,
        lineItems: formattedLineItems
      }
    };

  } catch (error) {
    console.error('Error fetching line items:', error.message || error);

    return {
      statusCode: error.response?.status || 500,
      body: {
        success: false,
        error: error.response?.data?.message || 'Unknown error occurred while fetching line items.'
      }
    };
  }
};