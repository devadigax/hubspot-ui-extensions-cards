# HubSpot UI Extensions

This repository contains a HubSpot developer project for custom CRM UI extensions and app functions.

## Project details

- Project name: `hubspot-ui-extensions`
- Platform version: `2026.03`
- Source directory: `src`

## Installation

### Prerequisites

- Node.js and npm
- HubSpot CLI (`hs`)
- A HubSpot account authenticated in the CLI

### Setup

1. Install project dependencies for the card extension:

```powershell
cd src/app/cards
npm install
```

2. Install project dependencies for the serverless functions:

```powershell
cd ../functions
npm install
```

3. From the project root, validate the HubSpot project:

```powershell
cd ../../..
hs project validate
```

4. Start local development:

```powershell
hs project dev
```

5. Upload the project when ready:

```powershell
hs project upload
```

## Cards created

The following HubSpot cards are currently defined in `src/app/cards`:

| Card | UID | Object Type | Entry Point | Description |
| --- | --- | --- | --- | --- |
| Contact Manager | `contact_manager` | `CONTACT` | `src/app/cards/contact_manager.tsx` | Allows you to manage contact information |
| Deal Manager | `deal_manager` | `DEAL` | `src/app/cards/deal_manager.tsx` | Allows you to manage deal information |
| Deal Line Items | `deal_lineitems` | `DEAL` | `src/app/cards/deal_lineitems.tsx` | Allows you to manage deal line items |

## Useful commands

```powershell
hs project dev
hs project validate
hs project upload
hs project list-builds
hs project deploy
```

## Notes

- HubSpot cards live in `src/app/cards`.
- HubSpot app functions live in `src/app/functions`.
- `hubspot.fetch()` requires fully qualified `https://` URLs and those URLs must be added to `permittedUrls.fetch` in `src/app/app-hsmeta.json`.
