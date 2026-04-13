const axios = require('axios');

exports.main = async (context) => {
  const { dealId, id, name, price, quantity, sku, productId, discount } = context.parameters;

  if (!name || !price || !quantity) {
    return { statusCode: 400, body: { success: false, error: 'Missing required fields' } };
  }

  try {
    const accessToken = process.env.PRIVATE_APP_ACCESS_TOKEN;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    
    const priceFloat = parseFloat(price) || 0;
    const qtyFloat = parseFloat(quantity) || 1; 
    const totalDiscountFloat = parseFloat(discount) || 0;
    
    const amount = ((priceFloat * qtyFloat) - totalDiscountFloat).toString();
    const perUnitDiscount = totalDiscountFloat / qtyFloat;

    const properties = {
      name: name,
      price: price.toString(),
      quantity: quantity.toString(),
      amount: amount,
      discount: perUnitDiscount.toString() 
    };

    if (sku) properties.hs_sku = sku;
    if (productId) properties.hs_product_id = productId;

    if (id) {
      await axios.patch(`https://api.hubapi.com/crm/v3/objects/line_items/${id}`, { properties }, { headers });
      return { statusCode: 200, body: { success: true, message: 'Line item updated.' } };
    } else {
      await axios.post(
        `https://api.hubapi.com/crm/v3/objects/line_items`,
        {
          properties: properties,
          associations: [
            {
              to: { id: dealId.toString() },
              types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 20 }]
            }
          ]
        },
        { headers }
      );
      return { statusCode: 200, body: { success: true, message: 'Line item created.' } };
    }
  } catch (error) {
    return { statusCode: 500, body: { success: false, error: 'Failed to save item.' } };
  }
};