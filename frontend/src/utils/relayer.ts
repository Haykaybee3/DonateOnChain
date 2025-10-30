const RELAYER_API_URL = import.meta.env.VITE_RELAYER_API_URL || 'http://localhost:3003';

export async function storeHashViaRelayer(cid: string, userAddress: string): Promise<{ transactionHash: string; fileHash: string }> {
  const response = await fetch(`${RELAYER_API_URL}/api/store-hash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid, userAddress }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Relayer API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to store hash via relayer');
  }

  return {
    transactionHash: data.transactionHash,
    fileHash: data.fileHash,
  };
}

