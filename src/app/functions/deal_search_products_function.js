const axios = require('axios');

exports.main = async (context) => {
  const { query } = context.parameters;

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/products/search',
      {
        filterGroups: [{ filters: [{ propertyName: 'name', operator: 'CONTAINS_TOKEN', value: query || '' }] }],
        properties: ['name', 'price', 'hs_sku'], // Added hs_sku
        limit: 10
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      }
    );

    const options = response.data.results.map(prod => ({
      label: `${prod.properties.name} - $${prod.properties.price || 0}`,
      value: prod.id,
      name: prod.properties.name,
      price: prod.properties.price,
      sku: prod.properties.hs_sku || '' // Map the SKU to the frontend options
    }));

    return { statusCode: 200, body: { success: true, options } };
  } catch (error) {
    return { statusCode: 500, body: { success: false, error: error.message } };
  }
};