require("dotenv").config();

const {
    Client,
    TokenMintTransaction,
    TokenId,
    Status,
    PrivateKey
} = require("@hashgraph/sdk");

async function testDirectMint() {
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const network = process.env.NETWORK || "testnet";
    const nftTokenId = process.env.NFT_TOKEN_ID;

    if (!accountId || !privateKey || !nftTokenId) {
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

        console.log(`\n=== Testing Direct Mint ===`);
        console.log(`Token ID: ${tokenId.toString()}`);
        console.log(`Minting account: ${accountId}`);
        
        const metadata = Buffer.from(JSON.stringify({
            campaignId: "1",
            amount: "1000000000",
            metadata: "test-direct-mint"
        }));
        
        const mintTx = await new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata([metadata])
            .setMaxTransactionFee(100000000)
            .freezeWith(client);
        
        const signed = await mintTx.sign(hederaPrivateKey);
        const txResponse = await signed.execute(client);
        const receipt = await txResponse.getReceipt(client);
        
        if (receipt.status !== Status.Success) {
            throw new Error(`Mint failed with status: ${receipt.status}`);
        }
        
        console.log(`✅ Direct mint successful!`);
        console.log(`Transaction ID: ${txResponse.transactionId.toString()}`);
        console.log(`Serial Numbers: ${receipt.serials.map(s => s.toString()).join(', ')}`);
        
        client.close();
    } catch (error) {
        console.error("Direct mint failed:", error.message);
        if (error.status) {
            console.error("Hedera Status:", error.status);
        }
        if (client) client.close();
        throw error;
    }
}

if (require.main === module) {
    testDirectMint().catch(error => {
        console.error("Test failed:", error.message);
        process.exit(1);
    });
}

module.exports = { testDirectMint };

