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
        properties: ['name', 'price', 'quantity', 'amount', 'hs_sku', 'hs_product_id', 'discount'] 
      },
      { headers }
    );

    const formattedLineItems = batchResponse.data.results.map(item => {
      const price = parseFloat(item.properties.price || '0');
      const quantity = parseFloat(item.properties.quantity || '0');
      const perUnitDiscount = parseFloat(item.properties.discount || '0');
      
      // Convert HubSpot's Per-Unit discount back to a Total Discount for the UI
      const totalDiscount = (perUnitDiscount * quantity).toFixed(2);

      return {
        id: item.id,
        productId: item.properties.hs_product_id || null,
        name: item.properties.name || 'Unnamed Line Item',
        sku: item.properties.hs_sku || '',
        price: price.toString(),
        quantity: quantity.toString(),
        discount: totalDiscount, // Pass Total Discount to UI
        amount: parseFloat(item.properties.amount || '0').toFixed(2)
      };
    });

    return { statusCode: 200, body: { success: true, lineItems: formattedLineItems } };

  } catch (error) {
    return { statusCode: 500, body: { success: false, error: 'Failed to fetch items.' } };
  }
};