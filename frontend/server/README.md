# Relayer Backend Service

This backend service acts as a relayer to store file hashes on-chain without requiring the user to sign additional transactions. The user only signs the campaign creation transaction.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
RELAYER_PRIVATE_KEY=0xYourRelayerPrivateKeyHere
PORT=3001
```

3. **Important**: The relayer wallet must be:
   - Funded with HBAR for transaction fees
   - Authorized to call `storeFileHashByNGO` on the FileManager contract
   - For Hedera Testnet, ensure the relayer account has sufficient HBAR balance

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on port 3001 (or the port specified in `PORT` env variable).

## API Endpoints

### POST `/api/store-hash`

Stores a file hash in the FileManager contract via the relayer wallet.

**Request Body:**
```json
{
  "cid": "Qm...",
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "receipt": {...},
  "fileHash": "0x..."
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "relayer": "0x..."
}
```

## Frontend Configuration

Set the environment variable in your frontend `.env` file:

```bash
VITE_RELAYER_API_URL=http://localhost:3001
```

For production, update this to your deployed relayer URL.

## Security Notes

- The relayer private key should be kept secure and never committed to version control
- Consider using environment variable management (e.g., AWS Secrets Manager, Azure Key Vault) in production
- The relayer wallet should have minimal HBAR balance required for gas fees
- Implement rate limiting and authentication in production deployments

