# System Roles and Operations Guide

A simple guide to understanding who can do what in the DonateOnchain platform.

## The Five Roles

The system operates with five distinct user types, each with specific capabilities:

1. **Owner** - The person who deployed the system (you)
2. **Admin** - Platform managers you trust
3. **Verified NGO** - Approved charitable organizations
4. **Verified Designer** - Approved artists creating designs
5. **Public Users** - Anyone who donates or buys designs

---

## 1. Owner (You)

**Who:** The person who deployed and deployed the contracts.

**What You Can Do:**
- Add or remove platform administrators
- Transfer system ownership to another address
- Full control over all contracts

**Key Responsibility:**
- Manage who has admin access to the platform

---

## 2. Admin Role

**Who:** Trusted platform managers added by the Owner.

**What Admins Can Do:**

**Manage Users:**
- Add new NGOs to the system (or approve pending NGO applications)
- Add new Designers to the system (or approve pending designer applications)
- Remove or deactivate NGOs
- Remove or deactivate Designers

**Manage Campaigns:**
- Create new donation campaigns
- Deactivate campaigns when needed
- Update campaign information

**Manage Platform:**
- Upload and manage files/metadata
- Configure system settings like platform wallet
- Enable or disable logging features

**Manage Designs:**
- Deactivate designs if needed

**Simple Summary:** Admins manage the platform, its users, campaigns, and content.

---

## 3. Verified NGO Role

**How to Become Verified:**
- Option 1: Admin adds them directly (instant approval)
- Option 2: NGO registers for approval, admin reviews and approves

**What NGOs Can Do:**

**Manage Their Profile:**
- Update their name, description, and profile images

**Upload Campaign Materials:**
- Store campaign images, documents, and metadata files

**Create & Manage Campaigns:**
- Create their own donation campaigns
- Set up campaigns with target amounts and descriptions
- Update their campaign information
- View all their campaigns

**Receive Funds:**
- Get 70% of all donations made to their campaigns
- Get 70% of design sales associated with their campaigns

**Simple Summary:** NGOs can create and manage their own campaigns, and receive most of the donation funds.

---

## 4. Verified Designer Role

**How to Become Verified:**
- Option 1: Admin adds them directly (instant approval)
- Option 2: Designer registers for approval, admin reviews and approves

**What Designers Can Do:**

**Manage Their Profile:**
- Update their name, bio, portfolio, and profile images

**Upload Design Materials:**
- Store design files, portfolios, and images
- Upload design metadata

**Create & Sell Designs:**
- Create designs for campaigns
- Set prices for their designs
- Manage their design listings
- Deactivate their designs if needed

**Receive Funds:**
- Get 20% of all donations made to campaigns featuring their designs
- Get 20% of design sales revenue
- Set their own design prices

**Simple Summary:** Designers create artistic designs for campaigns and receive a portion of donations and sales.

---

## 5. Public Users (Donors)

**Who:** Anyone visiting the platform

**What They Can Do:**

**Browse & View:**
- View all active campaigns
- See campaign details, images, and descriptions
- Browse designs available for purchase
- View NGO and Designer profiles
- Check donation history for campaigns
- Check their own donation history

**Support Campaigns:**
- Make donations to campaigns (in HBAR)
- Purchase designs from designers
- Automatically receive proof-of-donation NFTs when they donate
- Automatically receive proof-of-purchase NFTs when they buy designs

**How Funds Are Split When Someone Donates or Buys:**
- NGO receives 70%
- Designer receives 20%
- Platform receives 10%

**Simple Summary:** Public users can view everything, donate to campaigns, buy designs, and automatically get NFT proof of their transactions.

---

## Checkout Flow (On-Chain)
- Cart items that are designs are purchased via the DesignMarketplace contract on Hedera.
- On checkout, the app fetches on-chain prices, executes the purchase transaction(s) with HBAR, and stores an order record.
- Order receipts (tx hashes) are visible in profile → History with HashScan links.
- Donations are recorded separately and remain supported.

---

## How Roles Interact

### Typical Donation Flow
1. NGO creates a campaign
2. Designer creates a design for that campaign
3. Public user donates HBAR to the campaign
4. Funds automatically split: 70% to NGO, 20% to Designer, 10% to Platform
5. Donor receives an NFT as proof of donation

### Campaign Creation Flow (by Admin)
1. Admin adds NGO to the system
2. Admin adds Designer to the system
3. Admin uploads campaign metadata
4. Admin creates campaign with defined splits

### Campaign Creation Flow (by NGO)
1. NGO updates their profile
2. NGO uploads campaign materials
3. NGO creates their own campaign
4. NGO manages their campaign

### NGO/Designer Registration Flow
1. User applies to become NGO or Designer
2. Application goes to "pending" status
3. Admin reviews the application
4. Admin approves or rejects
5. If approved, user becomes verified and can use the system

---

## Who Can Do What - Quick Reference

| Task | Owner | Admin | NGO | Designer | Public |
|------|-------|-------|-----|----------|--------|
| Add/Remove Admins | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve NGOs/Designers | ❌ | ✅ | ❌ | ❌ | ❌ |
| Deactivate NGOs/Designers | ❌ | ✅ | ❌ | ❌ | ❌ |
| Update Own Profile | ❌ | ❌ | ✅ | ✅ | ❌ |
| Create Campaigns | ❌ | ✅ | ✅ | ❌ | ❌ |
| Update Campaigns | ❌ | ✅ | ✅ | ❌ | ❌ |
| Create Designs | ❌ | ❌ | ❌ | ✅ | ❌ |
| Donate to Campaigns | ❌ | ❌ | ❌ | ❌ | ✅ |
| Buy Designs | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload Files | ❌ | ✅ | ✅ | ✅ | ❌ |
| View Everything | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Revenue Distribution

**When someone donates or purchases a design:**

- 70% goes to the NGO running the campaign
- 20% goes to the Designer who created the design
- 10% goes to the platform (you)

This split is configurable per campaign but defaults to the above percentages.

---

## Security Features

The system includes several security measures:

- Only verified users can create content
- All financial transactions are protected from reentrancy attacks
- User permissions are checked before allowing actions
- File uploads must be verified before being used
- Pending approval system prevents unauthorized user creation
- All transfers have error handling to prevent fund loss

---

## Common Workflows Explained

### Admin Setup Workflow
Admin wants to create a new donation campaign:
1. Add an NGO to the system (if not already added)
2. Add a Designer to the system (if not already added)
3. Upload campaign images and metadata to IPFS
4. Create the campaign with appropriate fund splits

### NGO Self-Service Workflow
An NGO wants to create their own campaign:
1. Update their NGO profile with current information
2. Upload campaign images and materials to IPFS
3. Create their own campaign with target amount
4. Start receiving donations automatically

### Designer Workflow
A Designer wants to sell designs:
1. Update their profile and showcase portfolio
2. Upload design files to IPFS
3. Create designs for campaigns
4. Set prices for their designs
5. Start receiving revenue from sales

### Donor Experience
A user wants to support a campaign:
1. Browse active campaigns on the platform
2. View campaign details and goals
3. Make a donation using HBAR
4. Automatically receive an NFT proof of donation
5. Can track their donation history

---

## Key Concepts

**Verification System:**
- New NGOs and Designers can either be added instantly by admins, or apply for verification
- Pending applications await admin approval
- Only verified users can create content or receive funds

**Fund Splits:**
- Every donation and design purchase automatically splits funds
- The split is programmable per campaign
- Default is 70% NGO, 20% Designer, 10% Platform
- All splits must total 100%

**NFT Proof:**
- Every donation automatically mints an NFT to the donor
- Every design purchase automatically mints an NFT to the buyer
- These NFTs serve as permanent proof of transactions

**File Management:**
- All campaign images and metadata are stored on IPFS (decentralized storage)
- The blockchain stores the hash (fingerprint) of these files
- This keeps the blockchain lean while ensuring file integrity

**Proof of Mint:**
1. ✅ ProofNFT.donationManager() → 0x4de26c586644E3Fb64bE8b52cA3944Dae637882d
   ✓ DonationManager is authorized to mint NFTs

2. ✅ ProofNFT.nftTokenId() → 0x00000000000000000000000000000000006D0F04
   ✓ NFT Token ID configured (Hedera token 0.0.7147268)

3. ✅ DonationManager.hcsTopicId() → 0x00000000000000000000000000000000006d0f03
   ✓ HCS logging configured (Hedera topic 0.0.7147267)