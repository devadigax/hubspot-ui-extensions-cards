const axios = require('axios');

exports.main = async (context) => {
  const { id } = context.parameters;

  if (!id) {
    return { statusCode: 400, body: { success: false, error: 'Missing Line Item ID.' } };
  }

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Make a DELETE request to HubSpot CRM API
    await axios.delete(
      `https://api.hubapi.com/crm/v3/objects/line_items/${id}`,
      { headers }
    );

    return { statusCode: 200, body: { success: true, message: 'Line item successfully deleted.' } };

  } catch (error) {
    console.error('Error deleting line item:', error.message || error);
    return { statusCode: 500, body: { success: false, error: 'Failed to delete line item.' } };
  }
};