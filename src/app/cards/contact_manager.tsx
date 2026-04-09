import React, { useState } from 'react';
import { Button, Input, hubspot } from '@hubspot/ui-extensions';

// Define the extension to be run within HubSpot
hubspot.extend(({ context, actions }) => (
  <CreateContactForm
    context={context}
    addAlert={actions.addAlert}
  />
));

const CreateContactForm = ({ context, addAlert }) => {
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const result = await hubspot.serverless('app_function_private', {
        parameters: { email, firstname, lastname }
      });

      if (result.body.success) {
        addAlert({
          title: "Contact successfully created",
          message: `New contact ID: ${result.body.contactId}`,
          type: "success"
        });
      } else {
        addAlert({
          title: "Error creating contact",
          message: result.body.error,
          type: "danger"
        });
      }
    } catch (error) {
      addAlert({
        title: "Error creating contact",
        message: error.message,
        type: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Input value={email} onChange={setEmail} placeholder="Email" />
      <Input value={firstname} onChange={setFirstname} placeholder="First Name" />
      <Input value={lastname} onChange={setLastname} placeholder="Last Name" />
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating...' : 'Create Contact'}
      </Button>
    </>
  );
};