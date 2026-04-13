import React, { useState, useEffect } from 'react';
import { 
  Button, Input, Icon, Flex, Box, Select, Text, hubspot, 
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, LoadingSpinner 
} from '@hubspot/ui-extensions';

hubspot.extend(({ context, actions }) => (
  <LineItemManager context={context} addAlert={actions.addAlert} />
));

// --- MAIN COMPONENT: LIST & MANAGER ---
const LineItemManager = ({ context, addAlert }) => {
  const [lineItems, setLineItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const dealId = context.crm.objectId;

  const fetchLineItems = async () => {
    setLoadingItems(true);
    try {
      const result = await hubspot.serverless('get_line_items_function', {
        parameters: { dealId }
      });
      if (result.body.success) {
        setLineItems(result.body.lineItems);
      } else {
        addAlert({ title: "Error", message: result.body.error, type: "danger" });
      }
    } catch (error) {
      addAlert({ title: "Error", message: error.message, type: "danger" });
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchProducts = async (searchQuery = '') => {
    try {
      const result = await hubspot.serverless('search_products_function', {
        parameters: { query: searchQuery }
      });
      if (result.body.success) {
        setProducts(result.body.options);
      }
    } catch (error) {
      addAlert({ title: "Error", message: "Failed to load products", type: "danger" });
    }
  };

  useEffect(() => {
    fetchLineItems();
    fetchProducts();
  }, []);

  if (loadingItems) return <LoadingSpinner label="Loading line items..." />;

  return (
    <Flex direction="column" gap="medium">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Product</TableHeader>
            <TableHeader>Price ($)</TableHeader>
            <TableHeader>Qty</TableHeader>
            <TableHeader>Total Discount ($)</TableHeader>
            <TableHeader>Total ($)</TableHeader>
            <TableHeader>Action</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Render Existing Rows */}
          {lineItems.map(item => (
            <LineItemRow 
              key={item.id} 
              item={item} 
              dealId={dealId} 
              products={products}
              fetchProducts={fetchProducts}
              addAlert={addAlert} 
              onRefresh={fetchLineItems} 
            />
          ))}

          {/* Render Add Row inline if isAdding is true */}
          {isAdding && (
            <AddLineItemRow 
              dealId={dealId} 
              products={products}
              fetchProducts={fetchProducts}
              addAlert={addAlert} 
              onSuccess={() => {
                setIsAdding(false);
                fetchLineItems();
              }}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </TableBody>
      </Table>

      {!isAdding && (
        <Box>
          <Button variant="primary" onClick={() => setIsAdding(true)}>
            <Icon name="add" /> Add Line Item
          </Button>
        </Box>
      )}
    </Flex>
  );
};

// --- SUB-COMPONENT: INLINE EDIT ROW ---
const LineItemRow = ({ item, dealId, products, fetchProducts, addAlert, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [productId, setProductId] = useState(item.productId || '');
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku);
  const [price, setPrice] = useState(item.price);
  const [quantity, setQuantity] = useState(item.quantity);
  const [discount, setDiscount] = useState(item.discount || '0');
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChanges = 
    productId !== (item.productId || '') || 
    price !== item.price || 
    quantity !== item.quantity || 
    discount !== (item.discount || '0');

  // Calculate live amount for edit preview (Applied on Total)
  const liveTotal = Math.max(0, (parseFloat(price || 0) * parseFloat(quantity || 0)) - parseFloat(discount || 0)).toFixed(2);

  const handleCancel = () => {
    setProductId(item.productId || '');
    setName(item.name);
    setSku(item.sku);
    setPrice(item.price);
    setQuantity(item.quantity);
    setDiscount(item.discount || '0');
    setIsEditing(false);
  };

  const handleProductChange = (val) => {
    setProductId(val);
    const product = products.find(p => p.value === val);
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setPrice(product.price); 
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const result = await hubspot.serverless('save_line_item_function', {
        parameters: {
          dealId,
          id: item.id,
          name: name,
          price,
          quantity,
          discount, // Passing Total Discount
          productId: productId,
          sku: sku
        }
      });

      if (result.body.success) {
        addAlert({ title: "Success", message: "Line item updated", type: "success" });
        setIsEditing(false);
        onRefresh(); 
      } else {
        addAlert({ title: "Error", message: result.body.error, type: "danger" });
      }
    } catch (error) {
      addAlert({ title: "Error", message: error.message, type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await hubspot.serverless('delete_line_item_function', {
        parameters: { id: item.id }
      });

      if (result.body.success) {
        addAlert({ title: "Success", message: "Line item deleted", type: "success" });
        onRefresh(); 
      } else {
        addAlert({ title: "Error", message: result.body.error, type: "danger" });
        setDeleting(false);
      }
    } catch (error) {
      addAlert({ title: "Error", message: error.message, type: "danger" });
      setDeleting(false);
    }
  };

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Text format={{ fontWeight: "bold" }}>{item.name}</Text>
          <Text variant="microcopy">{item.sku || 'N/A'}</Text>
        </TableCell>
        <TableCell><Text>${item.price}</Text></TableCell>
        <TableCell><Text>{item.quantity}</Text></TableCell>
        <TableCell><Text>${item.discount}</Text></TableCell>
        <TableCell><Text format={{ fontWeight: "bold" }}>${item.amount}</Text></TableCell>
        <TableCell>
          <Flex direction="row" gap="small">
            <Button size="small" variant="secondary" onClick={() => setIsEditing(true)}>
              <Icon name="edit" />
            </Button>
            <Button size="small" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <LoadingSpinner size="xs" /> : <Icon name="delete" />}
            </Button>
          </Flex>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <Select
          name={`product-select-${item.id}`}
          options={products}
          value={productId}
          onChange={handleProductChange}
          onSearchInputChange={fetchProducts}
          placeholder="Select a product..."
          variant="transparent"
        />
        <Text variant="microcopy">{sku || 'N/A'}</Text>
      </TableCell>
      <TableCell><Input name={`price-${item.id}`} type="number" value={price} onChange={setPrice} /></TableCell>
      <TableCell><Input name={`qty-${item.id}`} type="number" value={quantity} onChange={setQuantity} /></TableCell>
      <TableCell><Input name={`disc-${item.id}`} type="number" value={discount} onChange={setDiscount} /></TableCell>
      <TableCell><Text format={{ fontWeight: "bold" }}>${liveTotal}</Text></TableCell>
      <TableCell>
        <Flex direction="row" gap="small">
          <Button size="small" variant="primary" disabled={!hasChanges || saving} onClick={handleUpdate}>
            {saving ? <LoadingSpinner size="xs" /> : <Icon name="save" />}
          </Button>
          <Button size="small" variant="secondary" onClick={handleCancel} disabled={saving}>
            <Icon name="remove" />
          </Button>
        </Flex>
      </TableCell>
    </TableRow>
  );
};

// --- SUB-COMPONENT: INLINE ADD ROW ---
const AddLineItemRow = ({ dealId, products, fetchProducts, addAlert, onSuccess, onCancel }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [price, setPrice] = useState('0');
  const [quantity, setQuantity] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [loading, setLoading] = useState(false);

  // Calculate live amount for the new row preview (Applied on Total)
  const liveTotal = Math.max(0, (parseFloat(price || 0) * parseFloat(quantity || 0)) - parseFloat(discount || 0)).toFixed(2);

  const handleProductChange = (val) => {
    setSelectedProductId(val);
    const product = products.find(p => p.value === val);
    setSelectedProductDetails(product || null);
    if (product) {
      setPrice(product.price || '0');
    }
  };

  const handleSaveItem = async () => {
    if (!selectedProductDetails) return;
    setLoading(true);

    try {
      const result = await hubspot.serverless('save_line_item_function', {
        parameters: {
          dealId,
          productId: selectedProductDetails.value,
          name: selectedProductDetails.name,
          price: price,
          sku: selectedProductDetails.sku,
          quantity,
          discount // Passing Total Discount
        }
      });

      if (result.body.success) {
        addAlert({ title: "Success", message: "Line item added", type: "success" });
        onSuccess();
      } else {
        addAlert({ title: "Error", message: result.body.error, type: "danger" });
      }
    } catch (error) {
      addAlert({ title: "Error", message: error.message, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TableRow>
      <TableCell>
        <Select
          name="product-select-new"
          options={products}
          value={selectedProductId}
          onChange={handleProductChange}
          onSearchInputChange={fetchProducts}
          placeholder="Search product..."
          variant="transparent"
        />
        {selectedProductDetails && (
          <Text variant="microcopy">
             {selectedProductDetails.sku || 'N/A'}
          </Text>
        )}
      </TableCell>
      <TableCell><Input name="new-price" type="number" value={price} onChange={setPrice} /></TableCell>
      <TableCell><Input name="new-qty" type="number" value={quantity} onChange={setQuantity} /></TableCell>
      <TableCell><Input name="new-disc" type="number" value={discount} onChange={setDiscount} /></TableCell>
      <TableCell><Text format={{ fontWeight: "bold" }}>${liveTotal}</Text></TableCell>
      <TableCell>
        <Flex direction="row" gap="small">
          <Button size="small" variant="primary" onClick={handleSaveItem} disabled={loading || !selectedProductId}>
            {loading ? <LoadingSpinner size="xs" /> : <Icon name="save" />}
          </Button>
          <Button size="small" variant="secondary" onClick={onCancel} disabled={loading}>
            <Icon name="remove" />
          </Button>
        </Flex>
      </TableCell>
    </TableRow>
  );
};