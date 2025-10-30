require("dotenv").config();

const {
    Client,
    TokenAssociateTransaction,
    TokenId,
    AccountId,
    Status,
    PrivateKey
} = require("@hashgraph/sdk");

async function associateContractToken() {
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const network = process.env.NETWORK || "testnet";
    const nftTokenId = process.env.NFT_TOKEN_ID;
    const proofNFTContractAddress = process.env.PROOF_NFT;
    const proofNFTAccountId = process.env.PROOF_NFT_ACCOUNT_ID || "0.0.7147292";

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

        const contractAccountId = AccountId.fromString(proofNFTAccountId);
        
        console.log(`\n=== Associating Contract with Token ===`);
        console.log(`Token ID: ${tokenId.toString()}`);
        console.log(`Contract Address (EVM): ${proofNFTContractAddress}`);
        console.log(`Contract Account ID (Hedera): ${contractAccountId.toString()}`);
        
        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(contractAccountId)
            .setTokenIds([tokenId])
            .setMaxTransactionFee(100000000)
            .freezeWith(client);
        
        const signed = await associateTx.sign(hederaPrivateKey);
        const txResponse = await signed.execute(client);
        const receipt = await txResponse.getReceipt(client);
        
        if (receipt.status !== Status.Success) {
            throw new Error(`Association failed with status: ${receipt.status}`);
        }
        
        console.log(`✅ Contract successfully associated with token!`);
        console.log(`Transaction ID: ${txResponse.transactionId.toString()}`);
        
        client.close();
    } catch (error) {
        console.error("Association failed:", error.message);
        if (error.status) {
            console.error("Hedera Status:", error.status);
        }
        if (client) client.close();
        throw error;
    }
}

if (require.main === module) {
    associateContractToken().catch(error => {
        console.error("Setup failed:", error.message);
        process.exit(1);
    });
}

module.exports = { associateContractToken };

