const axios = require('axios');

exports.main = async (context) => {
  const dealId = context.parameters.dealId;

  if (!dealId) return { statusCode: 400, body: { success: false, error: 'No Deal ID found.' } };

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const associationsResponse = await axios.get(
      `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/line_items`,
      { headers }
    );

    const lineItemIds = associationsResponse.data.results.map(assoc => assoc.toObjectId);

    if (lineItemIds.length === 0) return { statusCode: 200, body: { success: true, lineItems: [] } };

    const batchResponse = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/line_items/batch/read',
      {
        inputs: lineItemIds.map(id => ({ id: id.toString() })),
        // Added hs_sku and hs_product_id to the read properties
        properties: ['name', 'price', 'quantity', 'amount', 'hs_sku', 'hs_product_id'] 
      },
      { headers }
    );

    const formattedLineItems = batchResponse.data.results.map(item => ({
      id: item.id,
      productId: item.properties.hs_product_id || null, // Map this so editing works smoothly later
      name: item.properties.name || 'Unnamed Line Item',
      sku: item.properties.hs_sku || '', // Map the SKU
      price: item.properties.price || '0.00',
      quantity: item.properties.quantity || '0',
      amount: item.properties.amount || '0.00'
    }));

    return { statusCode: 200, body: { success: true, lineItems: formattedLineItems } };

  } catch (error) {
    return { statusCode: 500, body: { success: false, error: 'Failed to fetch items.' } };
  }
};