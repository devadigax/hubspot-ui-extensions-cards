const axios = require('axios');

exports.main = async (context) => {
  const { query } = context.parameters;

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    const filters = [{ propertyName: 'hs_status', operator: 'EQ', value: 'active' }];

    if (query) {
      filters.push({ propertyName: 'name', operator: 'CONTAINS_TOKEN', value: query });
    }

    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/products/search',
      {
        filterGroups: [{ filters: filters }],
        properties: ['name', 'price', 'hs_sku', 'hs_folder', 'hs_status'], 
        limit: 100 
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const options = response.data.results.map(prod => ({
      // Label formatting is now handled natively by the frontend, so we just return the raw values
      value: prod.id,
      name: prod.properties.name,
      price: prod.properties.price,
      sku: prod.properties.hs_sku || '',
      folder: prod.properties.hs_folder || '' 
    }));

    return { statusCode: 200, body: { success: true, options } };
  } catch (error) {
    return { statusCode: 500, body: { success: false, error: error.message } };
  }
};