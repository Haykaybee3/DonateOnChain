# Donate On Chain - Hedera Smart Contract System

A production-ready donation platform on Hedera with multi-registry architecture, campaign management, and automatic NFT proof-of-donation minting.

## Features

- **Campaign Management**: Structured campaigns with NGO, Designer, and Platform splits
- **Multi-Registry Architecture**: Separate registries for admins, NGOs, designers, and campaigns
- **Automatic Donation Splitting**: Configurable BPS-based fund distribution
- **Proof-of-Donation NFTs**: Automatic HTS NFT minting for each donation
- **Immutable Logging**: HCS integration for transparent audit trails
- **IPFS Integration**: Metadata stored off-chain with on-chain verification
- **Security**: Comprehensive access control, ReentrancyGuard, and input validation

## Architecture

### Core Contracts

**Registry Layer:**
- `AdminRegistry.sol` - Platform admin access control
- `NGORegistry.sol` - Verified NGO profiles with metadata
- `DesignerRegistry.sol` - Verified designer profiles with metadata  
- `FileManager.sol` - IPFS hash ↔ CID mappings

**Campaign Layer:**
- `CampaignRegistry.sol` - Campaign creation and management with split configurations
- `DonationManager.sol` - Donation processing with automatic fund splitting
- `ProofNFT.sol` - NFT minting for donation proofs

### Hedera Integration

Uses Hedera pre-compiled system contracts:
- **HTS (0x167)**: Mint NFTs via Hedera Token Service
- **HCS (0x169)**: Log donations to Hedera Consensus Service

### Hedera Native Resources

| Resource | ID | Purpose | Explorer |
|----------|-----|---------|----------|
| NFT Token | `0.0.7147268` | Proof-of-donation NFTs | [View on Hashscan](https://hashscan.io/testnet/token/0.0.7147268) |
| HCS Topic | `0.0.7147267` | Immutable donation logging | [View on Hashscan](https://hashscan.io/testnet/topic/0.0.7147267) |

## On-chain Checkout
- Designs in the cart are purchased via `DesignMarketplace` using HBAR.
- Checkout fetches on-chain prices and executes the purchase transaction(s).
- Orders are stored off-chain and show transaction receipts with HashScan links in Profile → History.
- Donations remain supported through `DonationManager`.

## Quick Start

### Prerequisites

```bash
npm install
forge install
```

### Deployment

1. **Deploy Registries:**
```bash
forge script script/DeployRegistries.s.sol:DeployRegistries --rpc-url $RPC_URL --broadcast --slow
```

2. **Configure Hedera Resources:**
Add `NFT_TOKEN_ID` and `HCS_TOPIC_ID` to your `.env` file, then:
```bash
forge script script/ConfigureContracts.s.sol:ConfigureContracts --rpc-url $RPC_URL --broadcast --slow
```

## Testing

```bash
forge test
```

## Documentation

- **`Guide.md`** - Complete reference for roles, functions, privileges, and role interactions

## Project Structure

```
src/
├── AdminRegistry.sol
├── NGORegistry.sol
├── DesignerRegistry.sol
├── FileManager.sol
├── CampaignRegistry.sol
├── DonationManager.sol
├── ProofNFT.sol
├── Errors.sol
└── interfaces/
    └── I*.sol

script/
├── DeployRegistries.s.sol
├── ConfigureContracts.s.sol
├── SetupTestCampaigns.s.sol
└── InteractDonation.s.sol

test/
├── AdminRegistry.t.sol
├── DonationManager.t.sol
└── FullFlow.t.sol
```

## Security

- ✅ ReentrancyGuard on all payable functions
- ✅ Ownable access control with admin registry
- ✅ BPS validation (must sum to 10000)
- ✅ Address validation
- ✅ File existence verification
- ✅ Safe HBAR transfers with error handling
- ✅ CEI pattern (Checks-Effects-Interactions)

## License

MIT
