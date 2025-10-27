/**
 * @fileoverview Sets up a Hedera Consensus Service topic and NFT token for donation tracking using an ECDSA account.
 * @requires @hashgraph/sdk
 * @requires dotenv
 */

require("dotenv").config();

const {
    Client,
    TopicCreateTransaction,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    PrivateKey,
    Status,
    TokenInfoQuery,
    AccountBalanceQuery
} = require("@hashgraph/sdk");

/**
 * Sets up a Hedera Consensus Service topic and NFT token for donation tracking.
 * @returns {Promise<{topicId: TopicId, tokenId: TokenId}>} The created topic and token IDs.
 * @throws {Error} If environment variables are missing, private key is invalid, or transactions fail.
 */
async function setupHedera() {
    // Load and validate environment variables
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;
    const network = process.env.NETWORK || "testnet";

    if (!accountId || !privateKey) {
        throw new Error("ACCOUNT_ID and PRIVATE_KEY must be set in .env file");
    }

    // Initialize Hedera client
    let client;
    try {
        client = Client.forName(network);
    } catch (error) {
        throw new Error(`Invalid network: ${network}. Error: ${error.message}`);
    }

    // Parse and validate private key (supports both ECDSA and DER formats)
    let hederaPrivateKey;
    try {
        if (privateKey.startsWith('0x')) {
            // ECDSA hex format
            hederaPrivateKey = PrivateKey.fromStringECDSA(privateKey.replace('0x', ''));
        } else {
            // DER format
            hederaPrivateKey = PrivateKey.fromString(privateKey);
        }
        console.log("Public Key (for debugging, do not log in production):", hederaPrivateKey.publicKey.toString());
    } catch (error) {
        throw new Error(`Invalid private key format: ${error.message}`);
    }

    // Validate operator account
    try {
        client.setOperator(accountId, hederaPrivateKey);
        const balance = await new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client);
        console.log(`Operator account ${accountId} balance: ${balance.hbars.toString()}`);
    } catch (error) {
        throw new Error(`Failed to validate operator account ${accountId}: ${error.message}`);
    }

    // Create HCS topic
    console.log("Creating HCS topic for donation logging...");
    const topicId = await createHCSTopic(client, hederaPrivateKey);
    console.log(`HCS Topic ID: ${topicId.toString()}`);

    // Create NFT token
    console.log("\nCreating NFT token for proof-of-donation...");
    const tokenId = await createNFTToken(client, hederaPrivateKey);
    console.log(`NFT Token ID: ${tokenId.toString()}`);

    // Verify token creation
    await verifyNFTToken(client, tokenId);

    // Output configuration
    console.log("\n=== Configuration ===");
    console.log(`HCS Topic Address: ${topicId.toSolidityAddress()}`);
    console.log(`NFT Token Address: ${tokenId.toSolidityAddress()}`);
    console.log(`Operator EVM Address: ${await hederaPrivateKey.publicKey.toEvmAddress()}`); // For EVM compatibility
    console.log("\nSave these addresses to your .env file:");
    console.log(`HCS_TOPIC_ADDRESS=${topicId.toSolidityAddress()}`);
    console.log(`NFT_TOKEN_ADDRESS=${tokenId.toSolidityAddress()}`);

    // Close client
    try {
        client.close();
    } catch (error) {
        console.error("Failed to close client:", error.message);
    }

    return { topicId, tokenId };
}

/**
 * Creates a Hedera Consensus Service topic for logging donations.
 * @param {Client} client - The Hedera client instance.
 * @param {PrivateKey} privateKey - The operator's private key.
 * @returns {Promise<TopicId>} The created topic ID.
 * @throws {Error} If topic creation fails or memo is invalid.
 */
async function createHCSTopic(client, privateKey) {
    const memo = "Donation logging topic";
    if (Buffer.from(memo).length > 100) {
        throw new Error("Topic memo exceeds 100 bytes");
    }

    try {
        const transaction = await new TopicCreateTransaction()
            .setSubmitKey(privateKey.publicKey)
            .setTopicMemo(memo)
            .setMaxTransactionFee(100000000)
            .freezeWith(client);

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        
        if (receipt.status !== Status.Success) {
            throw new Error(`Topic creation failed with status: ${receipt.status}`);
        }

        return receipt.topicId;
    } catch (error) {
        throw new Error(`Failed to create HCS topic: ${error.message}`);
    }
}

/**
 * Creates an NFT token for proof-of-donation.
 * @param {Client} client - The Hedera client instance.
 * @param {PrivateKey} privateKey - The operator's private key.
 * @returns {Promise<TokenId>} The created token ID.
 * @throws {Error} If token creation fails.
 */
async function createNFTToken(client, privateKey) {
    const accountId = client.operatorAccountId;

    try {
        const transaction = await new TokenCreateTransaction()
            .setTokenName("Proof of Donation")
            .setTokenSymbol("POD")
            .setTokenType(TokenType.NonFungibleUnique)
            .setSupplyType(TokenSupplyType.Finite)
            .setInitialSupply(0)
            .setMaxSupply(1000)
            .setTreasuryAccountId(accountId)
            .setAdminKey(privateKey.publicKey)
            .setSupplyKey(privateKey.publicKey)
            .setMaxTransactionFee(100000000)
            .freezeWith(client);

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        
        if (receipt.status !== Status.Success) {
            throw new Error(`Token creation failed with status: ${receipt.status}`);
        }

        return receipt.tokenId;
    } catch (error) {
        throw new Error(`Failed to create NFT token: ${error.message}`);
    }
}

/**
 * Verifies the created NFT token by querying its properties.
 * @param {Client} client - The Hedera client instance.
 * @param {TokenId} tokenId - The ID of the token to verify.
 * @returns {Promise<TokenInfo>} The token information.
 * @throws {Error} If token query fails.
 */
async function verifyNFTToken(client, tokenId) {
    try {
        const tokenInfo = await new TokenInfoQuery()
            .setTokenId(tokenId)
            .execute(client);
        console.log(`Verified Token - Name: ${tokenInfo.name}, Symbol: ${tokenInfo.symbol}, Type: ${tokenInfo.tokenType}`);
        return tokenInfo;
    } catch (error) {
        throw new Error(`Token verification failed: ${error.message}`);
    }
}

if (require.main === module) {
    // Ensure .env file is not committed to version control (add to .gitignore)
    // Never log PRIVATE_KEY in production
    setupHedera().catch(error => {
        console.error("Setup failed:", error.message);
        process.exit(1);
    });
}

module.exports = { setupHedera };