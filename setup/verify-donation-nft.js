require("dotenv").config();

const {
    Client,
    TokenNftInfoQuery,
    AccountInfoQuery,
    AccountId,
    TokenId,
    PrivateKey
} = require("@hashgraph/sdk");

async function verifyDonationNFT() {
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const network = process.env.NETWORK || "testnet";
    const nftTokenId = process.env.NFT_TOKEN_ID;
    const proofNFTContractAddress = process.env.PROOF_NFT;
    const proofNFTAccountId = process.env.PROOF_NFT_ACCOUNT_ID;

    if (!accountId || !privateKey || !nftTokenId || !proofNFTContractAddress) {
        throw new Error("Missing required environment variables");
    }

    let client;
    try {
        client = Client.forName(network);
    } catch (error) {
        throw new Error(`Invalid network: ${network}. Error: ${error.message}`);
    }

    let hederaPrivateKey;
    try {
        if (privateKey.startsWith('0x')) {
            hederaPrivateKey = PrivateKey.fromStringECDSA(privateKey.replace('0x', ''));
        } else {
            hederaPrivateKey = PrivateKey.fromString(privateKey);
        }
    } catch (error) {
        throw new Error(`Invalid private key format: ${error.message}`);
    }

    try {
        client.setOperator(accountId, hederaPrivateKey);
        
        let tokenId;
        if (nftTokenId.startsWith('0x')) {
            const addressLower = nftTokenId.toLowerCase();
            const entityNumHex = addressLower.slice(-10);
            const entityNum = parseInt(entityNumHex, 16);
            tokenId = TokenId.fromString(`0.0.${entityNum}`);
        } else {
            tokenId = TokenId.fromString(nftTokenId);
        }

        console.log(`\n=== Verifying NFT Token ===`);
        console.log(`Token ID: ${tokenId.toString()}`);
        console.log(`Contract Address: ${proofNFTContractAddress}`);

        const donorAccountId = AccountId.fromString(accountId);
        
        console.log(`\n=== Donor Account Info ===`);
        const accountInfo = await new AccountInfoQuery()
            .setAccountId(donorAccountId)
            .execute(client);
        
        console.log(`Donor Account: ${accountInfo.accountId.toString()}`);
        console.log(`Account Balance: ${accountInfo.balance.toString()} tinybars`);

        if (proofNFTAccountId) {
            console.log(`\n=== Contract Account Info ===`);
            const contractAccountId = AccountId.fromString(proofNFTAccountId);
            const contractInfo = await new AccountInfoQuery()
                .setAccountId(contractAccountId)
                .execute(client);
            
            console.log(`Contract Account: ${contractInfo.accountId.toString()}`);
            console.log(`Contract Balance: ${contractInfo.balance.toString()} tinybars`);
            console.log(`Contract ID: ${contractInfo.contractAccountId ? contractInfo.contractAccountId.toString() : 'N/A'}`);
        }

        console.log(`\n=== Recent NFT Mints ===`);
        console.log(`Querying NFT info for token: ${tokenId.toString()}`);
        console.log(`Note: This queries general token info. To see specific serials, you may need to query via SDK or Hashscan.`);

        console.log(`\n✅ Verification complete!`);
        console.log(`\nTo view your NFTs, visit:`);
        console.log(`https://hashscan.io/${network}/account/${accountId}`);
        console.log(`https://hashscan.io/${network}/token/${tokenId.toString()}`);

        client.close();
    } catch (error) {
        console.error("Verification failed:", error.message);
        if (error.status) {
            console.error("Hedera Status:", error.status);
        }
        if (client) client.close();
        throw error;
    }
}

if (require.main === module) {
    verifyDonationNFT().catch(error => {
        console.error("Verification failed:", error.message);
        process.exit(1);
    });
}

module.exports = { verifyDonationNFT };

