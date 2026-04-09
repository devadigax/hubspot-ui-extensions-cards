// deal_lineitems.tsx

import React, { useEffect, useState } from 'react';
import { 
  hubspot, 
  LoadingSpinner, 
  Alert, 
  Text,
  Table, 
  TableHead, 
  TableRow, 
  TableHeader, 
  TableBody, 
  TableCell,
  Button,
  Input,
  Flex,
  Select,
  Box
} from '@hubspot/ui-extensions';

hubspot.extend(({ context, actions }) => (
  <LineItemList context={context} addAlert={actions.addAlert} />
));

const LineItemList = ({ context, addAlert }) => {
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Product Search State
  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  // State for Inline Editing
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: null, productId: null, name: '', sku: '', price: '', quantity: '1' });

  const fetchLineItems = async () => {
    setLoading(true);
    try {
      const result = await hubspot.serverless('get_line_items_function', {
        parameters: { dealId: context.crm.objectId }
      });
      if (result.body.success) setLineItems(result.body.lineItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineItems();
  }, [context.crm.objectId]);

  // Search Product Library
  const handleSearchProducts = async (query) => {
    if (query.length < 2) return;
    setProductLoading(true);
    try {
      const result = await hubspot.serverless('search_products_function', {
        parameters: { query }
      });
      if (result.body.success) setProductOptions(result.body.options);
    } finally {
      setProductLoading(false);
    }
  };

  // Auto-fill logic when selecting from library
  const handleProductSelect = (productId) => {
    const selected = productOptions.find(opt => opt.value === productId);
    if (selected) {
      setEditFormData({
        ...editFormData,
        productId: selected.value,
        name: selected.name,
        sku: selected.sku,
        price: selected.price || '0'
      });
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditFormData({ 
      id: item.id, 
      productId: item.productId || null, 
      name: item.name, 
      sku: item.sku || '', 
      price: item.price, 
      quantity: item.quantity 
    });
  };

  const handleCreateNewClick = () => {
    if (editingId === 'NEW_TEMP_ITEM') return; 
    const tempItem = { id: 'NEW_TEMP_ITEM', name: '', sku: '', price: '0', quantity: '1', amount: '0' };
    setLineItems([...lineItems, tempItem]);
    setEditingId('NEW_TEMP_ITEM');
    setEditFormData({ id: null, productId: null, name: '', sku: '', price: '0', quantity: '1' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await hubspot.serverless('save_line_item_function', {
        parameters: { 
          dealId: context.crm.objectId,
          ...editFormData
        }
      });
      if (result.body.success) {
        addAlert({ title: "Success", message: result.body.message, type: "success" });
        setEditingId(null);
        fetchLineItems();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && lineItems.length === 0) return <LoadingSpinner label="Loading..." />;

  return (
    <Flex direction="column" gap="medium">
      <Table bordered={true}>
        <TableHead>
          <TableRow>
            <TableHeader>Product / Name</TableHeader>
            <TableHeader>SKU</TableHeader>
            <TableHeader>Qty</TableHeader>
            <TableHeader>Price ($)</TableHeader>
            <TableHeader>Amount ($)</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {lineItems.map((item) => {
            const isEditing = editingId === item.id;
            const isLibraryProduct = !!editFormData.productId;

            return (
              <TableRow key={item.id}>
                <TableCell>
                  {isEditing ? (
                    <Flex direction="column" gap="extra-small">
                      <Select
                        placeholder="Search Library..."
                        options={productOptions}
                        onInput={handleSearchProducts}
                        onChange={handleProductSelect}
                      />
                      <Text variant="microcopy" color="muted">{editFormData.name}</Text>
                    </Flex>
                  ) : item.name}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input 
                      value={editFormData.sku} 
                      onChange={(val) => setEditFormData({ ...editFormData, sku: val })} 
                      placeholder="SKU"
                      readonly={isLibraryProduct}
                    />
                  ) : item.sku}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input type="number" value={editFormData.quantity} onChange={(val) => setEditFormData({ ...editFormData, quantity: val })} />
                  ) : item.quantity}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input type="number" value={editFormData.price} onChange={(val) => setEditFormData({ ...editFormData, price: val })} />
                  ) : item.price}
                </TableCell>
                <TableCell format={{ fontWeight: 'bold' }}>
                  {isEditing 
                    ? (parseFloat(editFormData.price || 0) * parseFloat(editFormData.quantity || 0)).toFixed(2) 
                    : item.amount}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Flex direction="row" gap="small">
                      <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>Save</Button>
                      <Button size="sm" onClick={() => { 
                        if (editingId === 'NEW_TEMP_ITEM') setLineItems(lineItems.filter(i => i.id !== 'NEW_TEMP_ITEM'));
                        setEditingId(null);
                      }}>Cancel</Button>
                    </Flex>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => handleEditClick(item)} disabled={editingId !== null}>Edit</Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Flex direction="row" justify="between" align="center">
        <Box>
           <Text variant="microcopy">Total Items: {lineItems.length}</Text>
        </Box>
        <Button 
          size="sm" 
          variant="primary" 
          onClick={handleCreateNewClick} 
          disabled={editingId !== null}
        >
          + Add Line Item
        </Button>
      </Flex>
    </Flex>
  );
};