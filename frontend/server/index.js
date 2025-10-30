import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hederaTestnet } from 'viem/chains';
import { keccak256, stringToHex } from 'viem';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let FileManagerAbi, CONTRACTS, FILE_MANAGER_ADDRESS, account, client, publicClient;

async function initialize() {
  FileManagerAbi = JSON.parse(readFileSync(join(__dirname, '../frontend/src/contracts/FileManager.sol.abi.json'), 'utf-8'));
  const contractsModule = await import('../frontend/src/contracts/addresses.js');
  CONTRACTS = contractsModule.default;

  const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
  if (!RELAYER_PRIVATE_KEY) {
    console.error('ERROR: RELAYER_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  FILE_MANAGER_ADDRESS = CONTRACTS.FILE_MANAGER;
  if (!FILE_MANAGER_ADDRESS) {
    console.error('ERROR: FILE_MANAGER address not found in contracts');
    process.exit(1);
  }

  account = privateKeyToAccount(RELAYER_PRIVATE_KEY);
  client = createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http('https://testnet.hashio.io/api'),
  });

  publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http('https://testnet.hashio.io/api'),
  })
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/store-hash', async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: 'Relayer not initialized' });
  }
  try {
    const { cid, userAddress } = req.body;

    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    const fileHash = keccak256(stringToHex(cid));
  const hash = await client.writeContract({
    address: FILE_MANAGER_ADDRESS,
    abi: FileManagerAbi,
    functionName: 'storeFileHashAdmin',
    args: [fileHash, cid],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`[Relayer] Stored hash for CID ${cid} by user ${userAddress}, tx: ${hash}`);

    res.json({
      success: true,
      transactionHash: hash,
      fileHash: fileHash
    });
  } catch (error) {
    console.error('[Relayer] Error storing hash:', error);
    res.status(500).json({
      error: error.message || 'Failed to store file hash',
    });
  }
});

app.get('/api/health', (req, res) => {
  if (!account || !FILE_MANAGER_ADDRESS) {
    return res.status(503).json({ status: 'initializing' });
  }
  res.json({ status: 'ok', relayer: account.address, fileManager: FILE_MANAGER_ADDRESS });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  await initialize();
  app.listen(PORT, () => {
    console.log(`[Relayer] Server running on port ${PORT}`);
    console.log(`[Relayer] Wallet address: ${account.address}`);
    console.log(`[Relayer] FileManager: ${FILE_MANAGER_ADDRESS}`);
  });
}

startServer().catch((error) => {
  console.error('[Relayer] Failed to start server:', error);
  process.exit(1);
});

