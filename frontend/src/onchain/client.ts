import { wagmiConfig } from '../config/reownConfig'
import { readContract, writeContract, waitForTransactionReceipt, simulateContract, getPublicClient } from '@wagmi/core'
import type { Abi } from 'viem'

export async function read<T>({ address, abi, functionName, args }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[] }): Promise<T> {
  return await readContract(wagmiConfig, { address, abi, functionName, args }) as unknown as T
}

export async function simulate({ address, abi, functionName, args, value }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[]; value?: bigint }) {
  return await simulateContract(wagmiConfig, { address, abi, functionName, args, value })
}

export async function write({ address, abi, functionName, args, value }: { address: `0x${string}`; abi: Abi; functionName: string; args?: any[]; value?: bigint }) {
  const { request } = await simulate({ address, abi, functionName, args, value })
  const hash = await writeContract(wagmiConfig, request)
  return hash
}

export async function wait(hash: `0x${string}`) {
  return await waitForTransactionReceipt(wagmiConfig, { hash })
}

export function publicClient() {
  return getPublicClient(wagmiConfig)
}



