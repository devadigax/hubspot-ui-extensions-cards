import React, { useState } from 'react';
import { Button, Input, Flex, Box, hubspot } from '@hubspot/ui-extensions';

// Define the extension to be run within HubSpot
hubspot.extend(({ context, actions }) => (
  <CreateDealForm
    context={context}
    addAlert={actions.addAlert}
  />
));

const CreateDealForm = ({ context, addAlert }) => {
  const [dealname, setDealname] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Calling the newly named serverless function
      const result = await hubspot.serverless('create_deal_function', {
        parameters: { dealname, amount }
      });

      if (result.body.success) {
        addAlert({
          title: "Deal successfully created",
          message: `New deal ID: ${result.body.dealId}`,
          type: "success"
        });
        
        // Clear the form after success
        setDealname('');
        setAmount('');
      } else {
        addAlert({
          title: "Error creating deal",
          message: result.body.error,
          type: "danger"
        });
      }
    } catch (error) {
      addAlert({
        title: "Error creating deal",
        message: error.message,
        type: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" gap="small">
      <Box>
        <Input name="dealname" value={dealname} onChange={setDealname} placeholder="Deal Name (Required)" />
      </Box>
      <Box>
        <Input name="amount" type="number" value={amount} onChange={setAmount} placeholder="Amount ($)" />
      </Box>
      <Box>
        <Button onClick={handleSubmit} disabled={loading} variant="primary">
          {loading ? 'Creating...' : 'Create Deal'}
        </Button>
      </Box>
    </Flex>
  );
};