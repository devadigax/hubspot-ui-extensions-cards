// save_line_item_function.js
const axios = require('axios');

exports.main = async (context) => {
  const { dealId, id, name, price, quantity } = context.parameters;

  if (!name || !price || !quantity) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Missing required fields: name, price, or quantity' }
    };
  }

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Calculate total amount to keep HubSpot data clean
    const amount = (parseFloat(price) * parseFloat(quantity)).toString();

    if (id) {
      // ------------------------------------
      // UPDATE EXISTING LINE ITEM
      // ------------------------------------
      await axios.patch(
        `https://api.hubapi.com/crm/v3/objects/line_items/${id}`,
        {
          properties: {
            name: name,
            price: price.toString(),
            quantity: quantity.toString(),
            amount: amount
          }
        },
        { headers }
      );

      return {
        statusCode: 200,
        body: { success: true, message: 'Line item updated successfully.' }
      };

    } else {
      // ------------------------------------
      // CREATE NEW LINE ITEM
      // ------------------------------------
      if (!dealId) {
        return { statusCode: 400, body: { success: false, error: 'Deal ID is required to create an item.' } };
      }

      // Create line item and associate it to the Deal in a single request
      await axios.post(
        `https://api.hubapi.com/crm/v3/objects/line_items`,
        {
          properties: {
            name: name,
            price: price.toString(),
            quantity: quantity.toString(),
            amount: amount
          },
          associations: [
            {
              to: { id: dealId.toString() },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 20 // 20 is the default ID for Line Item -> Deal association
                }
              ]
            }
          ]
        },
        { headers }
      );

      return {
        statusCode: 200,
        body: { success: true, message: 'Line item created successfully.' }
      };
    }
  } catch (error) {
    console.error('Error saving line item:', error.message || error);
    return {
      statusCode: error.response?.status || 500,
      body: {
        success: false,
        error: error.response?.data?.message || 'Unknown error occurred while saving the line item.'
      }
    };
  }
};