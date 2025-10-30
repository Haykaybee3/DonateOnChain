require("dotenv").config();

const {
    Client,
    TokenUpdateTransaction,
    TokenId,
    KeyList,
    Status,
    TokenInfoQuery,
    PrivateKey
} = require("@hashgraph/sdk");

async function configureTokenPermissions() {
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const network = process.env.NETWORK || "testnet";
    const nftTokenId = process.env.NFT_TOKEN_ID;
    const proofNFTContract = process.env.PROOF_NFT;

    if (!accountId || !privateKey) {
        throw new Error("ACCOUNT_ID and PRIVATE_KEY must be set in .env file");
    }

    if (!nftTokenId) {
        throw new Error("NFT_TOKEN_ID must be set in .env file");
    }

    if (!proofNFTContract) {
        throw new Error("PROOF_NFT must be set in .env file");
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
        console.log(`\n=== Configuration ===`);
        console.log(`Operator Account (signing transactions): ${accountId}`);
        console.log(`NFT Token ID to configure: ${nftTokenId}`);
        console.log(`ProofNFT Contract: ${proofNFTContract}`);
    } catch (error) {
        throw new Error(`Failed to set operator: ${error.message}`);
    }

    try {
        let tokenId;
        if (nftTokenId.startsWith('0x')) {
            const addressLower = nftTokenId.toLowerCase();
            if (addressLower.length === 42 && addressLower.startsWith('0x')) {
                const entityNumHex = addressLower.slice(-10);
                const entityNum = parseInt(entityNumHex, 16);
                tokenId = TokenId.fromString(`0.0.${entityNum}`);
                console.log(`\nConverted Solidity address ${nftTokenId} to Hedera TokenId ${tokenId.toString()}`);
            } else {
                throw new Error(`Invalid Solidity address format: ${nftTokenId}`);
            }
        } else {
            tokenId = TokenId.fromString(nftTokenId);
        }
        
        console.log(`\n=== Current Token Configuration ===`);
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(tokenId)
            .execute(client);
        console.log(`Token Name: ${tokenInfo.name}`);
        console.log(`Token Symbol: ${tokenInfo.symbol}`);
        console.log(`Token ID: ${tokenId.toString()}`);
        console.log(`Token Address: ${tokenId.toSolidityAddress()}`);
        console.log(`ProofNFT Contract: ${proofNFTContract}`);
        
        const operatorPublicKey = hederaPrivateKey.publicKey;
        const operatorPublicKeyStr = operatorPublicKey.toStringDer();
        const currentSupplyKey = tokenInfo.supplyKey;
        const currentSupplyKeyStr = currentSupplyKey ? currentSupplyKey.toStringDer() : null;
        
        console.log(`\n=== Token Supply Key Status ===`);
        console.log(`Current Supply Key: ${currentSupplyKeyStr || "None"}`);
        console.log(`Operator Public Key: ${operatorPublicKeyStr}`);
        
        const keysMatch = currentSupplyKeyStr && 
            operatorPublicKey.toStringDer() === currentSupplyKeyStr;
        const needsUpdate = !currentSupplyKey || !keysMatch;
        
        if (needsUpdate) {
            console.log("\n⚠️  Supply key doesn't match operator key. Updating...");
            console.log("This ensures transactions signed by your account can mint through the contract.");
            
            const updateTransaction = await new TokenUpdateTransaction()
                .setTokenId(tokenId)
                .setSupplyKey(operatorPublicKey)
                .setMaxTransactionFee(100000000)
                .freezeWith(client);
            
            const signedUpdate = await updateTransaction.sign(hederaPrivateKey);
            const txResponse = await signedUpdate.execute(client);
            const receipt = await txResponse.getReceipt(client);
            
            if (receipt.status !== Status.Success) {
                throw new Error(`Token update failed with status: ${receipt.status}`);
            }
            
            console.log(`✅ Supply key updated to match operator's public key`);
            console.log(`Transaction ID: ${txResponse.transactionId.toString()}`);
        } else {
            console.log("\n✅ Token supply key already matches operator key.");
        }
        
        console.log(`\n=== How Contract Minting Works ===`);
        console.log("When you call donate() from your account (ACCOUNT_ID),");
        console.log("the transaction is signed with your private key (PRIVATE_KEY).");
        console.log("Since your account now has the supply key, the ProofNFT contract");
        console.log("can successfully mint NFTs when called from your account.");
        console.log("\n✅ Configuration complete! Try donating again.");
        
        client.close();
    } catch (error) {
        console.error("Configuration failed:", error.message);
        if (error.status) {
            console.error("Hedera Status:", error.status);
        }
        if (client) client.close();
        throw error;
    }
}

if (require.main === module) {
    configureTokenPermissions().catch(error => {
        console.error("Setup failed:", error.message);
        process.exit(1);
    });
}

module.exports = { configureTokenPermissions };

