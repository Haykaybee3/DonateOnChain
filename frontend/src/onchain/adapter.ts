import { abis, addresses } from './contracts'
import { read, write, wait, publicClient } from './client'
import type { Campaign, Design, NgoProfile, DesignerProfile, UserRoles, HexAddress } from '../types/onchain'
import { keccak256, stringToHex, decodeEventLog } from 'viem'

function toWei(hbar: number) {
  return BigInt(Math.floor(hbar * 1e18))
}

export { toWei }

// Lightweight fetch wrapper for IPFS JSON
async function fetchIpfsJson(cid: string): Promise<any | null> {
  try {
    const res = await fetch(`https://ipfs.io/ipfs/${cid}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function storeFileHashByDesigner(cid: string) {
  const fileHash = keccak256(stringToHex(cid))
  const hash = await write({ address: addresses.FILE_MANAGER as HexAddress, abi: abis.FileManager as any, functionName: 'storeFileHashByDesigner', args: [fileHash, cid] })
  return await wait(hash)
}

export async function storeFileHashByNGO(cid: string) {
  const fileHash = keccak256(stringToHex(cid))
  const hash = await write({ address: addresses.FILE_MANAGER as HexAddress, abi: abis.FileManager as any, functionName: 'storeFileHashByNGO', args: [fileHash, cid] })
  return await wait(hash)
}

export async function verifyFile(cid: string) {
  const fileHash = keccak256(stringToHex(cid))
  return await read<boolean>({ address: addresses.FILE_MANAGER as HexAddress, abi: abis.FileManager as any, functionName: 'verifyFile', args: [fileHash, cid] })
}

export async function getUserRoles(user: HexAddress): Promise<UserRoles> {
  const isAdmin = await read<boolean>({ address: addresses.ADMIN_REGISTRY as HexAddress, abi: abis.AdminRegistry as any, functionName: 'isAdmin', args: [user] })
  const ngo = await read<any>({ address: addresses.NGO_REGISTRY as HexAddress, abi: abis.NGORegistry as any, functionName: 'getNGO', args: [user] })
  const designer = await read<any>({ address: addresses.DESIGNER_REGISTRY as HexAddress, abi: abis.DesignerRegistry as any, functionName: 'getDesigner', args: [user] })
  const isNgoActive = Array.isArray(ngo) ? ngo[2] : ngo?.isActive;
  const isDesignerActive = Array.isArray(designer) ? designer[2] : designer?.isActive;
  return { isAdmin, isNgo: !!isNgoActive, isDesigner: !!isDesignerActive }
}

export async function listCampaigns(): Promise<Campaign[]> {
  const raw = await read<any[]>({ address: addresses.CAMPAIGN_REGISTRY as HexAddress, abi: abis.CampaignRegistry as any, functionName: 'getCampaigns' })
  return (raw || []).map((c: any) => ({
    id: BigInt(c.id ?? c[0]),
    title: c.title ?? c[1] ?? '',
    description: c.description ?? c[2] ?? '',
    goalHBAR: BigInt(c.goal ?? c[3] ?? 0n),
    ngo: (c.ngo ?? c[4]) as HexAddress,
    designer: c.designer as HexAddress | undefined,
    image: c.image ?? undefined,
  }))
}

export async function listActiveCampaignIds(): Promise<bigint[]> {
  try {
    const ids = await read<bigint[]>({ address: addresses.CAMPAIGN_REGISTRY as HexAddress, abi: abis.CampaignRegistry as any, functionName: 'getActiveCampaigns', args: [] })
    return ids || []
  } catch {
    return []
  }
}

export async function getCampaignMetadataCid(campaignId: bigint): Promise<string | null> {
  try {
    const cid = await read<string>({ address: addresses.CAMPAIGN_REGISTRY as HexAddress, abi: abis.CampaignRegistry as any, functionName: 'getCampaignMetadataCid', args: [campaignId] })
    return cid || null
  } catch {
    return null
  }
}

export async function listActiveCampaignsWithMeta(): Promise<Array<{ id: number; title: string; description: string; category?: string; onchainId?: bigint }>> {
  const ids = await listActiveCampaignIds()
  const results: Array<{ id: number; title: string; description: string; category?: string; onchainId?: bigint }> = []
  for (const id of ids) {
    let title = ''
    let description = ''
    let category: string | undefined
    const cid = await getCampaignMetadataCid(id)
    if (cid) {
      const meta = await fetchIpfsJson(cid)
      if (meta) {
        title = meta.title || ''
        description = meta.description || ''
        category = meta.category || undefined
      }
    }
    results.push({ id: Number(id), title, description, category, onchainId: id })
  }
  return results
}

export async function listAllCampaignsFromChain(): Promise<any[]> {
  try {
    const activeIds = await listActiveCampaignIds()
    const campaigns: any[] = []
    
    for (const id of activeIds) {
      try {
        const chainCampaign = await getCampaign(id)
        let amountRaised = 0
        try {
          const donations = await getDonationsByCampaign(id)
          amountRaised = donations.totalRaisedHBAR
        } catch {}
        
        let title = chainCampaign.title || ''
        let description = chainCampaign.description || ''
        let category: string | undefined
        let image: string | undefined = chainCampaign.image
        
        try {
          const cid = await getCampaignMetadataCid(id)
          if (cid) {
            const meta = await fetchIpfsJson(cid)
            if (meta) {
              title = meta.title || title
              description = meta.description || description
              category = meta.category || category
              image = meta.image || image
            }
          }
        } catch {}
        
        campaigns.push({
          id: Number(id),
          onchainId: Number(id),
          title,
          description,
          category,
          goal: Number(chainCampaign.goalHBAR) / 1e18,
          amountRaised,
          percentage: 0,
          ngoWallet: chainCampaign.ngo,
          designer: chainCampaign.designer,
          image,
          active: chainCampaign.active ?? true,
        })
      } catch (e) {
        console.warn(`Failed to load campaign ${id}:`, e)
        continue
      }
    }
    
    for (const campaign of campaigns) {
      const goal = campaign.goal || 0
      campaign.percentage = goal > 0 ? (campaign.amountRaised / goal) * 100 : 0
    }
    
    return campaigns
  } catch (error) {
    console.error('Error listing active campaigns from chain:', error)
    return []
  }
}

const ERC721_ABI_MIN = [
  { "type": "function", "name": "balanceOf", "inputs": [{ "name": "owner", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "tokenOfOwnerByIndex", "inputs": [{ "name": "owner", "type": "address" }, { "name": "index", "type": "uint256" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view" },
  { "type": "function", "name": "tokenURI", "inputs": [{ "name": "tokenId", "type": "uint256" }], "outputs": [{ "name": "", "type": "string" }], "stateMutability": "view" },
  { "type": "event", "name": "Transfer", "inputs": [ { "name": "from", "type": "address", "indexed": true }, { "name": "to", "type": "address", "indexed": true }, { "name": "tokenId", "type": "uint256", "indexed": true } ] }
] as const

export async function getProofNftAddress(): Promise<HexAddress | null> {
  try {
    const addr = await read<HexAddress>({ address: addresses.DESIGN_MARKETPLACE as HexAddress, abi: abis.DesignMarketplace as any, functionName: 'PROOF_NFT', args: [] })
    return addr
  } catch {
    return null
  }
}

export async function getUserProofNFTs(owner: HexAddress): Promise<Array<{ tokenId: bigint; tokenURI?: string; image?: string }>> {
  const collection = await getProofNftAddress()
  if (!collection) return []
  const client = publicClient()
  let tokenIds: bigint[] = []
  // Try ERC721Enumerable path
  try {
    const bal = await read<bigint>({ address: collection, abi: ERC721_ABI_MIN as any, functionName: 'balanceOf', args: [owner] })
    const total = Number(bal || 0n)
    for (let i = 0; i < total; i++) {
      try {
        const id = await read<bigint>({ address: collection, abi: ERC721_ABI_MIN as any, functionName: 'tokenOfOwnerByIndex', args: [owner, BigInt(i)] })
        tokenIds.push(id)
      } catch { break }
    }
  } catch {
    // Fallback: scan Transfer logs to this owner
    try {
      const logs = await client.getLogs({
        address: collection,
        fromBlock: 'earliest',
        toBlock: 'latest',
        // topics[1] = indexed from, topics[2] = indexed to
      })
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({ abi: ERC721_ABI_MIN as any, data: log.data, topics: log.topics }) as any
          if (decoded.eventName === 'Transfer') {
            const toAddr = (decoded.args?.to || '').toLowerCase()
            const fromAddr = (decoded.args?.from || '').toLowerCase()
            const id = BigInt(decoded.args?.tokenId || 0)
            if (toAddr === owner.toLowerCase()) tokenIds.push(id)
            if (fromAddr === owner.toLowerCase()) tokenIds = tokenIds.filter(t => t !== id)
          }
        } catch { continue }
      }
    } catch {}
  }

  const uniqueIds = Array.from(new Set(tokenIds.map(String))).map(v => BigInt(v))
  const results: Array<{ tokenId: bigint; tokenURI?: string; image?: string }> = []
  for (const id of uniqueIds) {
    let uri: string | undefined
    try {
      uri = await read<string>({ address: collection, abi: ERC721_ABI_MIN as any, functionName: 'tokenURI', args: [id] })
    } catch {}
    let image: string | undefined
    if (uri) {
      try {
        const http = uri.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${uri.replace('ipfs://','')}` : uri
        const meta = await fetch(http).then(r => r.json()).catch(() => null)
        image = meta?.image ? (meta.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${meta.image.replace('ipfs://','')}` : meta.image) : undefined
      } catch {}
    }
    results.push({ tokenId: id, tokenURI: uri, image })
  }
  return results
}

export async function syncCampaignsWithOnChain(firebaseCampaigns: any[]): Promise<any[]> {
  try {
    const activeIds = await listActiveCampaignIds()
    const syncedCampaigns: any[] = []
    
    for (const firebaseCampaign of firebaseCampaigns) {
      let onchainId: bigint | undefined
      
      if (firebaseCampaign.onchainId) {
        onchainId = BigInt(firebaseCampaign.onchainId)
      } else if (firebaseCampaign.ngoWallet) {
        for (const id of activeIds) {
          try {
            const chainCampaign = await getCampaign(id)
            if (chainCampaign.ngo?.toLowerCase() === firebaseCampaign.ngoWallet?.toLowerCase()) {
              onchainId = id
              break
            }
          } catch {
            continue
          }
        }
      }
      
      if (onchainId) {
        try {
          const chainCampaign = await getCampaign(onchainId)
          const donations = await getDonationsByCampaign(onchainId)
          syncedCampaigns.push({
            ...firebaseCampaign,
            id: Number(onchainId),
            onchainId: Number(onchainId),
            amountRaised: donations.totalRaisedHBAR,
            goal: Number(chainCampaign.goalHBAR) / 1e18,
            active: chainCampaign.active ?? true,
            ngoWallet: chainCampaign.ngo,
          })
        } catch {
          syncedCampaigns.push({
            ...firebaseCampaign,
            onchainId: Number(onchainId),
          })
        }
      } else {
        syncedCampaigns.push(firebaseCampaign)
      }
    }
    
    return syncedCampaigns
  } catch (error) {
    console.error('Error syncing campaigns with on-chain:', error)
    return firebaseCampaigns
  }
}

export async function getCampaign(id: bigint): Promise<Campaign & { active?: boolean }> {
  const c = await read<any>({ address: addresses.CAMPAIGN_REGISTRY as HexAddress, abi: abis.CampaignRegistry as any, functionName: 'getCampaign', args: [id] })
  
  let ngo: HexAddress
  let designer: HexAddress | undefined
  let active: boolean
  
  if (Array.isArray(c)) {
    ngo = c[0] as HexAddress
    designer = c[1] as HexAddress | undefined
    active = c[5] !== undefined ? Boolean(c[5]) : true
  } else if (c && typeof c === 'object') {
    ngo = (c.ngo ?? c[0]) as HexAddress
    designer = (c.designer ?? c[1]) as HexAddress | undefined
    if (c.active !== undefined) {
      active = Boolean(c.active)
    } else if (c[5] !== undefined) {
      active = Boolean(c[5])
    } else {
      active = true
    }
  } else {
    throw new Error('Invalid campaign data')
  }
  
  return {
    id: BigInt(id),
    title: c.title ?? '',
    description: c.description ?? '',
    goalHBAR: BigInt(c.goal ?? 0n),
    ngo,
    designer,
    image: c.image ?? undefined,
    active,
  }
}

export async function isCampaignActive(campaignId: bigint): Promise<boolean> {
  try {
    const activeIds = await listActiveCampaignIds()
    return activeIds.some((id) => id === campaignId)
  } catch {
    return false
  }
}

export async function deactivateCampaign(campaignId: bigint) {
  const hash = await write({
    address: addresses.CAMPAIGN_REGISTRY as HexAddress,
    abi: abis.CampaignRegistry as any,
    functionName: 'deactivateCampaign',
    args: [campaignId]
  })
  return await wait(hash)
}

export async function deactivateDesign(designId: bigint) {
  const hash = await write({
    address: addresses.DESIGN_MARKETPLACE as HexAddress,
    abi: abis.DesignMarketplace as any,
    functionName: 'deactivateDesign',
    args: [designId]
  })
  return await wait(hash)
}

export async function deactivateNGO(ngo: HexAddress) {
  const hash = await write({
    address: addresses.NGO_REGISTRY as HexAddress,
    abi: abis.NGORegistry as any,
    functionName: 'deactivateNGO',
    args: [ngo]
  })
  return await wait(hash)
}

export async function deactivateDesigner(designer: HexAddress) {
  const hash = await write({
    address: addresses.DESIGNER_REGISTRY as HexAddress,
    abi: abis.DesignerRegistry as any,
    functionName: 'deactivateDesigner',
    args: [designer]
  })
  return await wait(hash)
}

export async function createCampaignByNGO(params: { designer: HexAddress; title: string; description: string; imageCid: string; metadataCid: string; targetHBAR: number; ngoBps?: number; designerBps?: number; platformBps?: number }): Promise<{ receipt: any; campaignId: bigint }> {
  const ngoBps = params.ngoBps ?? 7000
  const designerBps = params.designerBps ?? 2000
  const platformBps = params.platformBps ?? 1000
  const metadataHash = keccak256(stringToHex(params.metadataCid))
  const targetWei = toWei(params.targetHBAR)
  
  const campaignCountBefore = await read<bigint>({
    address: addresses.CAMPAIGN_REGISTRY as HexAddress,
    abi: abis.CampaignRegistry as any,
    functionName: 'campaignCount',
    args: []
  }).catch(() => 0n)
  
  const hash = await write({
    address: addresses.CAMPAIGN_REGISTRY as HexAddress,
    abi: abis.CampaignRegistry as any,
    functionName: 'createCampaignByNGO',
    args: [params.designer, params.title, params.description, params.imageCid, metadataHash, targetWei, BigInt(ngoBps), BigInt(designerBps), BigInt(platformBps)]
  })
  
  const receipt = await wait(hash)
  
  const status = receipt.status as string | number | undefined
  if (status === 'reverted' || status === 0 || status === '0x0') {
    throw new Error('Campaign creation transaction failed or was reverted')
  }
  
  let campaignId: bigint | undefined
  
  try {
    const client = publicClient()
    const fullReceipt = await client.getTransactionReceipt({ hash })
    
    if (fullReceipt.logs) {
      for (const log of fullReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: abis.CampaignRegistry as any,
            data: log.data,
            topics: log.topics,
          }) as any
          if (decoded.eventName === 'CampaignCreated' && decoded.args?.campaignId) {
            campaignId = BigInt(decoded.args.campaignId)
            break
          }
        } catch {
          continue
        }
      }
    }
  } catch (eventError) {
    console.warn('Failed to parse events, trying campaign count method:', eventError)
  }
  
  if (!campaignId) {
    try {
      const campaignCountAfter = await read<bigint>({
        address: addresses.CAMPAIGN_REGISTRY as HexAddress,
        abi: abis.CampaignRegistry as any,
        functionName: 'campaignCount',
        args: []
      })
      
      if (campaignCountAfter > campaignCountBefore) {
        campaignId = campaignCountAfter - 1n
      } else {
        throw new Error('Campaign count did not increase')
      }
    } catch (error) {
      console.warn('Failed to get campaign count, trying alternative method:', error)
      const activeIds = await listActiveCampaignIds()
      if (activeIds.length > 0) {
        const newIds = activeIds.filter(id => id >= campaignCountBefore)
        if (newIds.length > 0) {
          campaignId = newIds[newIds.length - 1]
        } else {
          campaignId = activeIds[activeIds.length - 1]
        }
      }
    }
  }
  
  if (campaignId === undefined) {
    throw new Error('Failed to retrieve campaign ID after creation. Transaction may have failed.')
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  try {
    const verifyCampaign = await getCampaign(campaignId)
    if (!verifyCampaign || !verifyCampaign.ngo) {
      throw new Error('Campaign verification failed')
    }
  } catch (verifyError) {
    console.warn('Campaign verification failed, but ID was retrieved:', verifyError)
  }
  
  return { receipt, campaignId }
}

export async function getDesignById(designId: bigint): Promise<Design | null> {
  try {
    const d = await read<any>({ address: addresses.DESIGN_MARKETPLACE as HexAddress, abi: abis.DesignMarketplace as any, functionName: 'getDesign', args: [designId] })
    return {
      id: designId,
      title: d.designName ?? d[2] ?? '',
      priceHBAR: BigInt(d.price ?? d[3] ?? 0n),
      campaignId: BigInt(d.campaignId ?? d[1] ?? 0n),
      designer: (d.designer ?? d[0]) as HexAddress,
      image: undefined,
    }
  } catch {
    return null
  }
}

export async function listDesigns(): Promise<Design[]> {
  try {
    const count = await read<bigint>({ address: addresses.DESIGN_MARKETPLACE as HexAddress, abi: abis.DesignMarketplace as any, functionName: 'designCount', args: [] })
    const total = Number(count || 0n)
    const results: Design[] = []
    for (let i = 1; i <= total; i++) {
      const d = await getDesignById(BigInt(i))
      if (d) results.push(d)
    }
    return results
  } catch {
    return []
  }
}

export async function getDesignPrice(designId: bigint): Promise<bigint> {
  const d = await getDesignById(designId)
  return d?.priceHBAR ?? 0n
}

export async function getNgoProfile(owner: HexAddress): Promise<NgoProfile> {
  const p = await read<any>({ address: addresses.NGO_REGISTRY as HexAddress, abi: abis.NGORegistry as any, functionName: 'getNGO', args: [owner] })
  return { owner, name: p.name ?? '', description: p.description ?? '', image: p.image ?? undefined }
}

export async function getDesignerProfile(owner: HexAddress): Promise<DesignerProfile> {
  const p = await read<any>({ address: addresses.DESIGNER_REGISTRY as HexAddress, abi: abis.DesignerRegistry as any, functionName: 'getDesigner', args: [owner] })
  return { owner, name: p.name ?? '', bio: p.bio ?? '', image: p.image ?? undefined }
}

export async function donate(params: { campaignId: bigint; valueHBAR: number; metadataHash?: string }) {
  if (params.valueHBAR <= 0) {
    throw new Error('Donation amount must be greater than zero')
  }
  
  try {
    const campaign = await getCampaign(params.campaignId)
    if (!campaign.active) {
      throw new Error('Campaign is not active. Donations are not currently accepted for this campaign.')
    }
  } catch (campaignError: any) {
    if (campaignError.message?.includes('not active')) {
      throw campaignError
    }
    throw new Error(`Campaign ${params.campaignId} not found or not accessible on-chain. Please verify the campaign exists.`)
  }
  
  const value = toWei(params.valueHBAR)
  const metadataHash = params.metadataHash || ''
  
  try {
    const hash = await write({ address: addresses.DONATION_MANAGER as HexAddress, abi: abis.DonationManager as any, functionName: 'donate', args: [params.campaignId, metadataHash], value })
  return await wait(hash)
  } catch (error: any) {
    console.error('Donation error details:', error)
    
    const errorData = error?.data || error?.cause?.data || error?.reason
    const errorSignature = typeof errorData === 'string' && errorData.startsWith('0x') ? errorData.slice(0, 10) : null
    
    if (errorSignature) {
      switch (errorSignature) {
        case '0x2c067cd7':
          throw new Error('Campaign is not active. Donations are not currently accepted for this campaign.')
        case '0xae921357':
          throw new Error(`Campaign ${params.campaignId} not found on-chain. The campaign may not exist or may have been removed.`)
        case '0x1f2a2005':
          throw new Error('Transfer failed. Unable to send funds. Please try again.')
        case '0x8456cb59':
          throw new Error('Reentrancy guard activated. Please wait and try again.')
        default:
          console.warn('Unknown error signature:', errorSignature)
      }
    }
    
    if (error?.message) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('inactivecampaign') || errorMsg.includes('inactive') || errorMsg.includes('0x2c067cd7')) {
        throw new Error('Campaign is not active. Donations are not currently accepted for this campaign.')
      }
      if (errorMsg.includes('zeroamount') || errorMsg.includes('zero')) {
        throw new Error('Donation amount must be greater than zero')
      }
      if (errorMsg.includes('transferfailed') || errorMsg.includes('transfer failed')) {
        throw new Error('Transfer failed. Unable to send funds. Please try again.')
      }
      if (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('0xae921357')) {
        throw new Error(`Campaign ${params.campaignId} not found on-chain. The campaign may not exist or may have been removed.`)
      }
    }
    
    if (error?.shortMessage) {
      const shortMsg = error.shortMessage.toLowerCase()
      if (shortMsg.includes('inactive') || shortMsg.includes('0x2c067cd7')) {
        throw new Error('Campaign is not active. Donations are not currently accepted for this campaign.')
      }
      if (shortMsg.includes('not found') || shortMsg.includes('does not exist') || shortMsg.includes('0xae921357')) {
        throw new Error(`Campaign ${params.campaignId} not found on-chain. The campaign may not exist or may have been removed.`)
      }
    }
    
    if (error?.cause?.message) {
      const causeMsg = error.cause.message.toLowerCase()
      if (causeMsg.includes('campaign') && (causeMsg.includes('not found') || causeMsg.includes('does not exist'))) {
        throw new Error(`Campaign ${params.campaignId} not found on-chain. The campaign may not exist or may have been removed.`)
      }
    }
    
    throw new Error(`Donation failed: ${error?.message || error?.shortMessage || 'Unknown error. Please verify the campaign exists and try again.'}`)
  }
}

export async function getDonationsByCampaign(campaignId: bigint) {
  const result = await read<any>({ address: addresses.DONATION_MANAGER as HexAddress, abi: abis.DonationManager as any, functionName: 'getDonationsByCampaign', args: [campaignId] })
  const donors = result.donors ?? result[0] ?? []
  const amounts = result.amounts ?? result[1] ?? []
  const timestamps = result.timestamps ?? result[2] ?? []
  const nftSerialNumbers = result.nftSerialNumbers ?? result[3] ?? []
  const totalRaised = amounts.reduce((sum: bigint, amt: bigint) => sum + BigInt(amt || 0n), 0n)
  return {
    donors: donors as HexAddress[],
    amounts: amounts as bigint[],
    timestamps: timestamps as bigint[],
    nftSerialNumbers: nftSerialNumbers as bigint[],
    totalRaisedHBAR: Number(totalRaised) / 1e18,
    count: donors.length
  }
}

export async function purchaseDesign(params: { designId: bigint; valueHBAR: number }) {
  const value = toWei(params.valueHBAR)
  const hash = await write({ address: addresses.DESIGN_MARKETPLACE as HexAddress, abi: abis.DesignMarketplace as any, functionName: 'purchaseDesign', args: [params.designId], value })
  return await wait(hash)
}

export async function purchaseDesignWithHBAR(designId: bigint, quantity: number) {
  if (quantity <= 0) return null
  const price = await getDesignPrice(designId)
  const totalHBAR = Number(price) / 1e18 * quantity
  return await purchaseDesign({ designId, valueHBAR: totalHBAR })
}

export async function batchPurchaseDesignsPayable(items: { designId: bigint; quantity: number }[]) {
  const filtered = items.filter(i => i.quantity > 0)
  let total = 0n
  for (const it of filtered) {
    const p = await getDesignPrice(it.designId)
    total += p * BigInt(it.quantity)
  }
  try {
    const args = [filtered.map(i => [i.designId, BigInt(i.quantity)])]
    const hash = await write({ address: addresses.DESIGN_MARKETPLACE as HexAddress, abi: abis.DesignMarketplace as any, functionName: 'purchaseBatch', args, value: total })
    return await wait(hash)
  } catch {
    const receipts: any[] = []
    for (const it of filtered) {
      const r = await purchaseDesignWithHBAR(it.designId, it.quantity)
      if (r) receipts.push(r)
    }
    return receipts
  }
}

export async function simulatePurchase(items: { designId: bigint; quantity: number }[]) {
  let total = 0n
  for (const it of items) {
    const price = await getDesignPrice(it.designId)
    total += price * BigInt(it.quantity)
  }
  return total
}

export async function createDesign(params: { campaignId: bigint; designName: string; description: string; designFileCid: string; previewImageCid: string; metadataCid: string; priceHBAR: number }) {
  const price = toWei(params.priceHBAR)
  
  if (params.priceHBAR <= 0 || params.priceHBAR > 1000000) {
    throw new Error(`Invalid price: ${params.priceHBAR} HBAR. Must be between 0 and 1,000,000.`)
  }

  try {
    const campaign = await getCampaign(params.campaignId)
    if (!campaign) {
      throw new Error(`Campaign ${params.campaignId} not found`)
    }
  } catch (e) {
    throw new Error(`Campaign ${params.campaignId} is not active or does not exist`)
  }

  try {
    const hash = await write({
      address: addresses.DESIGN_MARKETPLACE as HexAddress,
      abi: abis.DesignMarketplace as any,
      functionName: 'createDesign',
      args: [params.campaignId, params.designName, params.description, params.designFileCid, params.previewImageCid, params.metadataCid, price]
    })
    return await wait(hash)
  } catch (err) {
    try {
      const needDesign = !(await verifyFile(params.designFileCid))
      const needPreview = params.previewImageCid && !(await verifyFile(params.previewImageCid))
      const needMeta = !(await verifyFile(params.metadataCid))
      if (needDesign) await storeFileHashByDesigner(params.designFileCid)
      if (needPreview) await storeFileHashByDesigner(params.previewImageCid)
      if (needMeta) await storeFileHashByDesigner(params.metadataCid)

      const retryHash = await write({
        address: addresses.DESIGN_MARKETPLACE as HexAddress,
        abi: abis.DesignMarketplace as any,
        functionName: 'createDesign',
        args: [params.campaignId, params.designName, params.description, params.designFileCid, params.previewImageCid, params.metadataCid, price]
      })
      return await wait(retryHash)
    } catch (e) {
      throw err
    }
  }
}

export async function adminAddAdmin(admin: HexAddress) {
  const hash = await write({ address: addresses.ADMIN_REGISTRY as HexAddress, abi: abis.AdminRegistry as any, functionName: 'addAdmin', args: [admin] })
  return await wait(hash)
}

export async function adminRemoveAdmin(admin: HexAddress) {
  const hash = await write({ address: addresses.ADMIN_REGISTRY as HexAddress, abi: abis.AdminRegistry as any, functionName: 'removeAdmin', args: [admin] })
  return await wait(hash)
}

export async function adminApproveNgo(wallet: HexAddress) {
  const hash = await write({ address: addresses.NGO_REGISTRY as HexAddress, abi: abis.NGORegistry as any, functionName: 'approveNGO', args: [wallet] })
  const receipt = await wait(hash)
  return { ...receipt, hash }
}

export async function adminAddNgo(params: { wallet: HexAddress; metadataHash: string }) {
  const hash = await write({ address: addresses.NGO_REGISTRY as HexAddress, abi: abis.NGORegistry as any, functionName: 'addNGO', args: [params.wallet, params.metadataHash] })
  return await wait(hash)
}

export async function adminApproveDesigner(wallet: HexAddress) {
  const hash = await write({ address: addresses.DESIGNER_REGISTRY as HexAddress, abi: abis.DesignerRegistry as any, functionName: 'approveDesigner', args: [wallet] })
  const receipt = await wait(hash)
  return { ...receipt, hash }
}

export async function adminAddDesigner(params: { wallet: HexAddress; portfolioHash: string }) {
  const hash = await write({ address: addresses.DESIGNER_REGISTRY as HexAddress, abi: abis.DesignerRegistry as any, functionName: 'addDesigner', args: [params.wallet, params.portfolioHash] })
  return await wait(hash)
}

export async function listPendingNgos(): Promise<HexAddress[]> {
  return await read<HexAddress[]>({ address: addresses.NGO_REGISTRY as HexAddress, abi: abis.NGORegistry as any, functionName: 'getPendingNGOs' })
}

export async function listPendingDesigners(): Promise<HexAddress[]> {
  return await read<HexAddress[]>({ address: addresses.DESIGNER_REGISTRY as HexAddress, abi: abis.DesignerRegistry as any, functionName: 'getPendingDesigners' })
}

export async function ngoRegisterPending(params: { name: string; description: string; profileImageHash: string; metadataHash: string }) {
  const hash = await write({ address: addresses.NGO_REGISTRY as HexAddress, abi: abis.NGORegistry as any, functionName: 'registerNGOPending', args: [params.name, params.description, params.profileImageHash, params.metadataHash] })
  return await wait(hash)
}

export async function designerRegisterPending(params: { name: string; bio: string; portfolioHash: string; profileImageHash: string }) {
  const hash = await write({ address: addresses.DESIGNER_REGISTRY as HexAddress, abi: abis.DesignerRegistry as any, functionName: 'registerDesignerPending', args: [params.name, params.bio, params.portfolioHash, params.profileImageHash] })
  return await wait(hash)
}


