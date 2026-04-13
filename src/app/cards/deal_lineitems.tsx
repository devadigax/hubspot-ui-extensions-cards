import React, { useState, useEffect } from 'react';
import { 
  Button, Icon, Flex, Box, Select, Text, hubspot, 
  Table, TableHead, TableRow, TableHeader, TableBody, TableCell, LoadingSpinner,
  NumberInput, CurrencyInput, LoadingButton, Inline
} from '@hubspot/ui-extensions';

hubspot.extend(({ context, actions }) => (
  <LineItemManager context={context} addAlert={actions.addAlert} />
));

// Helper function to format currency natively
const formatCurrency = (value, currencyCode) => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'USD',
  }).format(value);
};

// --- MAIN COMPONENT: LIST & MANAGER ---
const LineItemManager = ({ context, addAlert }) => {
  const [lineItems, setLineItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [currencyCode, setCurrencyCode] = useState('USD');
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
        const fetchedCurrency = result.body.currencyCode || 'USD';
        setCurrencyCode(fetchedCurrency);
        
        // Fetch products only after we know the currency code so the dropdown formats correctly
        fetchProducts('', fetchedCurrency);
      } else {
        addAlert({ title: "Error", message: result.body.error, type: "danger" });
      }
    } catch (error) {
      addAlert({ title: "Error", message: error.message, type: "danger" });
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchProducts = async (searchQuery = '', currCode = currencyCode) => {
    try {
      const result = await hubspot.serverless('search_products_function', {
        parameters: { query: searchQuery }
      });
      if (result.body.success) {
        // Map labels dynamically based on the current currency
        const formattedOptions = result.body.options.map(prod => ({
          ...prod,
          label: `${prod.name} - ${formatCurrency(prod.price || 0, currCode)}`
        }));
        setProducts(formattedOptions);
      }
    } catch (error) {
      addAlert({ title: "Error", message: "Failed to load products", type: "danger" });
    }
  };

  useEffect(() => {
    // This will trigger fetchProducts internally once the currency is acquired
    fetchLineItems();
  }, []);

  if (loadingItems) return <LoadingSpinner label="Loading line items..." />;

  return (
    <Flex direction="column" gap="medium">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Product</TableHeader>
            <TableHeader>Price</TableHeader>
            <TableHeader>Qty</TableHeader>
            <TableHeader>Total Discount</TableHeader>
            <TableHeader>Total ({currencyCode})</TableHeader>
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
              currencyCode={currencyCode}
              fetchProducts={(q) => fetchProducts(q, currencyCode)}
              addAlert={addAlert} 
              onRefresh={fetchLineItems} 
            />
          ))}

          {/* Render Add Row inline if isAdding is true */}
          {isAdding && (
            <AddLineItemRow 
              dealId={dealId} 
              products={products}
              currencyCode={currencyCode}
              fetchProducts={(q) => fetchProducts(q, currencyCode)}
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
const LineItemRow = ({ item, dealId, products, currencyCode, fetchProducts, addAlert, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [productId, setProductId] = useState(item.productId || '');
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku);
  
  const [price, setPrice] = useState(Number(item.price) || 0);
  const [quantity, setQuantity] = useState(Number(item.quantity) || 1);
  const [discount, setDiscount] = useState(Number(item.discount) || 0);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChanges = 
    productId !== (item.productId || '') || 
    price !== (Number(item.price) || 0) || 
    quantity !== (Number(item.quantity) || 1) || 
    discount !== (Number(item.discount) || 0);

  const liveTotal = Math.max(0, (price * quantity) - discount);

  const handleCancel = () => {
    setProductId(item.productId || '');
    setName(item.name);
    setSku(item.sku);
    setPrice(Number(item.price) || 0);
    setQuantity(Number(item.quantity) || 1);
    setDiscount(Number(item.discount) || 0);
    setIsEditing(false);
  };

  const handleProductChange = (val) => {
    setProductId(val);
    const product = products.find(p => p.value === val);
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setPrice(Number(product.price) || 0); 
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
          price: price.toString(),
          quantity: quantity.toString(),
          discount: discount.toString(),
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
          <Text format={{ fontWeight: "bold" }}>{item.name}
            <Text variant="microcopy">{item.sku || 'N/A'}</Text>
          </Text>
        </TableCell>
        <TableCell><Text>{formatCurrency(item.price, currencyCode)}</Text></TableCell>
        <TableCell><Text>{item.quantity}</Text></TableCell>
        <TableCell><Text>{formatCurrency(item.discount, currencyCode)}</Text></TableCell>
        <TableCell><Text format={{ fontWeight: "bold" }}>{formatCurrency(item.amount, currencyCode)}</Text></TableCell>
        <TableCell>
          <Inline gap="small">
            <Button size="small" variant="secondary" onClick={() => setIsEditing(true)}>
              <Icon name="edit" />
            </Button>
            <LoadingButton size="small" variant="destructive" loading={deleting} onClick={handleDelete}>
              <Icon name="delete" />
            </LoadingButton>
          </Inline>
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
      <TableCell>
        <CurrencyInput currency={currencyCode} label="Unit Price" name={`price-${item.id}`} value={price} onChange={setPrice} />
      </TableCell>
      <TableCell>
        <NumberInput label="Quantity" name={`qty-${item.id}`} value={quantity} onChange={setQuantity} />
      </TableCell>
      <TableCell>
        <CurrencyInput currency={currencyCode} label="Discount Amount" name={`disc-${item.id}`} value={discount} onChange={setDiscount} />
      </TableCell>
      <TableCell><Text format={{ fontWeight: "bold" }}>{formatCurrency(liveTotal, currencyCode)}</Text></TableCell>
      <TableCell>
        <Inline gap="small">
          <LoadingButton size="small" variant="primary" loading={saving} disabled={!hasChanges} onClick={handleUpdate}>
            <Icon name="save" />
          </LoadingButton>
          <Button size="small" variant="secondary" onClick={handleCancel} disabled={saving}>
            <Icon name="remove" />
          </Button>
        </Inline>
      </TableCell>
    </TableRow>
  );
};

// --- SUB-COMPONENT: INLINE ADD ROW ---
const AddLineItemRow = ({ dealId, products, currencyCode, fetchProducts, addAlert, onSuccess, onCancel }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  const liveTotal = Math.max(0, (price * quantity) - discount);

  const handleProductChange = (val) => {
    setSelectedProductId(val);
    const product = products.find(p => p.value === val);
    setSelectedProductDetails(product || null);
    if (product) {
      setPrice(Number(product.price) || 0);
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
          price: price.toString(),
          sku: selectedProductDetails.sku,
          quantity: quantity.toString(),
          discount: discount.toString()
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
      <TableCell>
        <CurrencyInput currency={currencyCode} label="Unit Price" name="new-price" value={price} onChange={setPrice} />
      </TableCell>
      <TableCell>
        <NumberInput label="Quantity" name="new-qty" value={quantity} onChange={setQuantity} />
      </TableCell>
      <TableCell>
        <CurrencyInput currency={currencyCode} label="Discount Amount" name="new-disc" value={discount} onChange={setDiscount} />
      </TableCell>
      <TableCell><Text format={{ fontWeight: "bold" }}>{formatCurrency(liveTotal, currencyCode)}</Text></TableCell>
      <TableCell>
        <Inline gap="small">
          <LoadingButton size="small" variant="primary" loading={loading} disabled={!selectedProductId} onClick={handleSaveItem}>
            <Icon name="save" />
          </LoadingButton>
          <Button size="small" variant="secondary" onClick={onCancel} disabled={loading}>
            <Icon name="remove" />
          </Button>
        </Inline>
      </TableCell>
    </TableRow>
  );
};