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
  Flex
} from '@hubspot/ui-extensions';

hubspot.extend(({ context, actions }) => (
  <LineItemList context={context} addAlert={actions.addAlert} />
));

const LineItemList = ({ context, addAlert }) => {
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for Inline Editing
  const [editingId, setEditingId] = useState(null); // Tracks which row is in edit mode
  const [saving, setSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: null, name: '', price: '', quantity: '1' });

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

  // --- INLINE EDIT HANDLERS ---

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditFormData({ id: item.id, name: item.name, price: item.price, quantity: item.quantity });
  };

  const handleCreateNewClick = () => {
    // Prevent opening multiple new rows at once
    if (editingId === 'NEW_TEMP_ITEM') return; 

    // Append a temporary blank item to the UI list
    const tempItem = { id: 'NEW_TEMP_ITEM', name: '', price: '', quantity: '1', amount: '0' };
    setLineItems([...lineItems, tempItem]);
    
    // Set it into edit mode
    setEditingId('NEW_TEMP_ITEM');
    setEditFormData({ id: null, name: '', price: '', quantity: '1' });
  };

  const handleCancelEdit = () => {
    // If we were creating a new item, remove the temporary row from the list
    if (editingId === 'NEW_TEMP_ITEM') {
      setLineItems(lineItems.filter(item => item.id !== 'NEW_TEMP_ITEM'));
    }
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!editFormData.name || !editFormData.price || !editFormData.quantity) {
      addAlert({ title: "Validation Error", message: "Name, Price, and Qty are required.", type: "danger" });
      return;
    }

    setSaving(true);
    try {
      const result = await hubspot.serverless('save_line_item_function', {
        parameters: { 
          dealId: context.crm.objectId,
          id: editFormData.id, 
          name: editFormData.name,
          price: editFormData.price,
          quantity: editFormData.quantity
        }
      });

      if (result.body.success) {
        addAlert({ title: "Success", message: result.body.message, type: "success" });
        setEditingId(null);
        fetchLineItems(); // Refresh data to get real HubSpot IDs and calculated amounts
      } else {
        addAlert({ title: "Error saving item", message: result.body.error, type: "danger" });
      }
    } catch (err) {
      addAlert({ title: "Error saving item", message: err.message, type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  // --- RENDERERS ---

  if (loading && lineItems.length === 0) {
    return <LoadingSpinner label="Loading line items..." />;
  }

  if (error) {
    return <Alert title="Error loading data" variant="danger">{error}</Alert>;
  }

  return (
    <Flex direction="column" gap="medium">
      
      {/* INLINE TABLE */}
      {lineItems.length === 0 && editingId === null ? (
        <Text>No line items found for this deal.</Text>
      ) : (
        <Table bordered={true}>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Qty</TableHeader>
              <TableHeader>Price ($)</TableHeader>
              <TableHeader>Amount ($)</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineItems.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <TableRow key={item.id}>
                  {/* NAME COLUMN */}
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        value={editFormData.name} 
                        onChange={(val) => setEditFormData({ ...editFormData, name: val })} 
                        placeholder="Name"
                      />
                    ) : (
                      item.name
                    )}
                  </TableCell>

                  {/* QUANTITY COLUMN */}
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        type="number"
                        value={editFormData.quantity} 
                        onChange={(val) => setEditFormData({ ...editFormData, quantity: val })} 
                      />
                    ) : (
                      item.quantity
                    )}
                  </TableCell>

                  {/* PRICE COLUMN */}
                  <TableCell>
                    {isEditing ? (
                      <Input 
                        type="number"
                        value={editFormData.price} 
                        onChange={(val) => setEditFormData({ ...editFormData, price: val })} 
                        placeholder="0.00"
                      />
                    ) : (
                      item.price
                    )}
                  </TableCell>

                  {/* AMOUNT COLUMN (Always read-only, calculated dynamically during edit) */}
                  <TableCell format={{ fontWeight: 'bold' }}>
                    {isEditing 
                      ? (parseFloat(editFormData.price || 0) * parseFloat(editFormData.quantity || 0)).toFixed(2) 
                      : item.amount}
                  </TableCell>

                  {/* ACTIONS COLUMN */}
                  <TableCell>
                    {isEditing ? (
                      <Flex direction="row" gap="small">
                        <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                          {saving ? '...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                          Cancel
                        </Button>
                      </Flex>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleEditClick(item)} 
                        disabled={editingId !== null} // Disable edit on other rows if one is active
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* FOOTER WITH CREATE BUTTON */}
      <Flex direction="row" justify="between" align="center">
        <Text format={{ fontWeight: 'bold' }}>Deal Line Items</Text>
        <Button 
          size="sm" 
          variant="primary" 
          onClick={handleCreateNewClick} 
          disabled={editingId !== null} // Disable new button if currently editing
        >
          + Add Line Item
        </Button>
      </Flex>
    </Flex>
  );
};