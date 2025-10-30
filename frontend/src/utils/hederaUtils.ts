import { getAccountBalance, getAccountInfo, convertEvmAddressToAccountId } from '../config/hederaClient';

export const getHederaBalanceForEvmAddress = async (evmAddress: string): Promise<string | null> => {
  try {
    const accountId = convertEvmAddressToAccountId(evmAddress);
    if (!accountId) {
      console.warn('Could not convert EVM address to Hedera Account ID');
      return null;
    }
    
    const balance = await getAccountBalance(accountId);
    return balance;
  } catch (error) {
    console.error('Error fetching Hedera balance for EVM address:', error);
    return null;
  }
};

export const getHederaAccountInfoForEvmAddress = async (evmAddress: string) => {
  try {
    const accountId = convertEvmAddressToAccountId(evmAddress);
    if (!accountId) {
      console.warn('Could not convert EVM address to Hedera Account ID');
      return null;
    }
    
    const info = await getAccountInfo(accountId);
    return info;
  } catch (error) {
    console.error('Error fetching Hedera account info for EVM address:', error);
    return null;
  }
};

export { convertEvmAddressToAccountId };

