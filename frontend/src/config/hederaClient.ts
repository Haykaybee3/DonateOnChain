import { Client, AccountId, AccountBalanceQuery, AccountInfoQuery } from "@hashgraph/sdk";

export const getHederaClient = () => {
  return Client.forTestnet();
};

export const getAccountBalance = async (accountId: string): Promise<string> => {
  try {
    const client = getHederaClient();
    const balance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);
    
    return balance.hbars.toString();
  } catch (error) {
    console.error("Error fetching Hedera account balance:", error);
    throw error;
  }
};

export const getAccountBalanceInTinybars = async (accountId: string): Promise<string> => {
  try {
    const client = getHederaClient();
    const balance = await new AccountBalanceQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);
    
    return balance.hbars.toTinybars().toString();
  } catch (error) {
    console.error("Error fetching Hedera account balance:", error);
    throw error;
  }
};

export const getAccountInfo = async (accountId: string) => {
  try {
    const client = getHederaClient();
    const info = await new AccountInfoQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);
    
    return {
      accountId: info.accountId.toString(),
      balance: info.balance.toString(),
      key: info.key?.toString() || null,
    };
  } catch (error) {
    console.error("Error fetching Hedera account info:", error);
    throw error;
  }
};

export const convertEvmAddressToAccountId = (evmAddress: string): string | null => {
  try {
    if (!evmAddress || !evmAddress.startsWith('0x')) {
      return null;
    }
    
    const addressBytes = evmAddress.slice(2);
    const shard = 0;
    const realm = 0;
    const num = parseInt(addressBytes.slice(-8), 16);
    
    return `${shard}.${realm}.${num}`;
  } catch (error) {
    console.error("Error converting EVM address to Account ID:", error);
    return null;
  }
};

export const hbarToTinybars = (hbar: number): bigint => {
  return BigInt(Math.floor(hbar * 1e8));
};

export const tinybarsToHbar = (tinybars: bigint): number => {
  return Number(tinybars) / 1e8;
};

