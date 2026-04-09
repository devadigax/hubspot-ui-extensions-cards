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
  Box,
  Divider
} from '@hubspot/ui-extensions';

// Define the extension and pass actions so we can trigger alerts
hubspot.extend(({ context, actions }) => (
  <LineItemList context={context} addAlert={actions.addAlert} />
));

const LineItemList = ({ context, addAlert }) => {
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for the Create/Edit Form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', price: '', quantity: '1' });

  // Extracted fetch function so we can call it after saving
  const fetchLineItems = async () => {
    setLoading(true);
    try {
      const result = await hubspot.serverless('get_line_items_function', {
        parameters: { dealId: context.crm.objectId }
      });
      
      if (result.body.success) {
        setLineItems(result.body.lineItems);
      } else {
        setError(result.body.error || 'Failed to load line items.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineItems();
  }, [context.crm.objectId]);

  // Form Handlers
  const handleEditClick = (item) => {
    setFormData({ id: item.id, name: item.name, price: item.price, quantity: item.quantity });
    setShowForm(true);
  };

  const handleCreateNewClick = () => {
    setFormData({ id: null, name: '', price: '', quantity: '1' });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormData({ id: null, name: '', price: '', quantity: '1' });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.quantity) {
      addAlert({ title: "Validation Error", message: "All fields are required.", type: "danger" });
      return;
    }

    setSaving(true);
    try {
      const result = await hubspot.serverless('save_line_item_function', {
        parameters: { 
          dealId: context.crm.objectId,
          id: formData.id, // Will be null for new creations
          name: formData.name,
          price: formData.price,
          quantity: formData.quantity
        }
      });

      if (result.body.success) {
        addAlert({ title: "Success", message: result.body.message, type: "success" });
        setShowForm(false);
        fetchLineItems(); // Refresh the table
      } else {
        addAlert({ title: "Error saving item", message: result.body.error, type: "danger" });
      }
    } catch (err) {
      addAlert({ title: "Error saving item", message: err.message, type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  if (loading && lineItems.length === 0) {
    return <LoadingSpinner label="Loading line items..." />;
  }

  if (error) {
    return <Alert title="Error loading data" variant="danger">{error}</Alert>;
  }

  return (
    <Flex direction="column" gap="medium">
      
      {/* HEADER WITH CREATE BUTTON */}
      <Flex direction="row" justify="between" align="center">
        <Text format={{ fontWeight: 'bold' }}>Deal Line Items</Text>
        {!showForm && (
          <Button size="sm" variant="primary" onClick={handleCreateNewClick}>
            + Add Line Item
          </Button>
        )}
      </Flex>

      <Divider />

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <Box>
          <Text format={{ fontWeight: 'bold' }} variant="microcopy">
            {formData.id ? 'Edit Line Item' : 'New Line Item'}
          </Text>
          <Flex direction="column" gap="small">
            <Input 
              value={formData.name} 
              onChange={(val) => setFormData({ ...formData, name: val })} 
              placeholder="Item Name" 
            />
            <Flex direction="row" gap="small">
              <Input 
                type="number" 
                value={formData.price} 
                onChange={(val) => setFormData({ ...formData, price: val })} 
                placeholder="Price ($)" 
              />
              <Input 
                type="number" 
                value={formData.quantity} 
                onChange={(val) => setFormData({ ...formData, quantity: val })} 
                placeholder="Qty" 
              />
            </Flex>
            <Flex direction="row" gap="small">
              <Button onClick={handleSave} variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Item'}
              </Button>
              <Button onClick={handleCancelForm} variant="secondary" disabled={saving}>
                Cancel
              </Button>
            </Flex>
          </Flex>
          <Divider />
        </Box>
      )}

      {/* TABLE */}
      {lineItems.length === 0 && !showForm ? (
        <Text>No line items found for this deal.</Text>
      ) : (
        <Table bordered={true}>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Qty</TableHeader>
              <TableHeader>Price</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>${item.price}</TableCell>
                <TableCell format={{ fontWeight: 'bold' }}>${item.amount}</TableCell>
                <TableCell>
                  <Button size="sm" variant="secondary" onClick={() => handleEditClick(item)} disabled={saving || showForm}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Flex>
  );
};