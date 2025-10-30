const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || ''
const PINATA_URL = import.meta.env.VITE_PINATA_URL || 'https://api.pinata.cloud'

const checkCredentials = () => {
  if (!PINATA_JWT || PINATA_JWT === '') {
    console.error('❌ Pinata JWT is missing!')
    console.error('Please create a .env file with: VITE_PINATA_JWT=your_jwt_token_here')
    return false
  }
  return true
}

const getPinataHeaders = () => ({ 'Authorization': `Bearer ${PINATA_JWT}` })

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

export const uploadFileToIPFS = async (file: File): Promise<string | null> => {
  if (!checkCredentials()) {
    return null
  }
  
  try {
    const ctl = withTimeout(25000)
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${PINATA_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: getPinataHeaders(),
      body: formData,
      signal: ctl.signal,
    })
    ctl.clear()
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Pinata upload error:', error)
      if (response.status === 401) {
        console.error('❌ Invalid Pinata credentials. The JWT token signature is invalid.')
        console.error('💡 Try generating a new JWT token at https://app.pinata.cloud/developers')
      }
      return null
    }
    
    const data = await response.json()
    return data.IpfsHash
  } catch (error) {
    console.error('Error uploading file to IPFS. Check network/DNS and VITE_PINATA_JWT:', error)
    return null
  }
}

export const uploadMetadataToIPFS = async (metadata: any): Promise<string | null> => {
  if (!checkCredentials()) {
    return null
  }
  
  try {
    const ctl = withTimeout(25000)
    const response = await fetch(`${PINATA_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPinataHeaders()
      },
      body: JSON.stringify({
        pinataMetadata: {
          name: 'NGO-Metadata'
        },
        pinataContent: metadata
      }),
      signal: ctl.signal,
    })
    ctl.clear()
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Pinata metadata upload error:', error)
      if (response.status === 401) {
        console.error('❌ Invalid Pinata credentials. Check your JWT token in .env')
      }
      return null
    }
    
    const data = await response.json()
    return data.IpfsHash
  } catch (error) {
    console.error('Error uploading metadata to IPFS. Check network/DNS and VITE_PINATA_JWT:', error)
    return null
  }
}

export const getIPFSHash = async (content: string | File): Promise<string | null> => {
  try {
    if (content instanceof File) {
      return await uploadFileToIPFS(content)
    } else {
      const metadata = typeof content === 'string' ? JSON.parse(content) : content
      return await uploadMetadataToIPFS(metadata)
    }
  } catch (error) {
    console.error('Error getting IPFS hash:', error)
    return null
  }
}

export const getIPFSURL = (hash: string): string => {
  return `https://gateway.pinata.cloud/ipfs/${hash}`
}

export const unpinCID = async (cid: string): Promise<boolean> => {
  if (!checkCredentials()) return false
  try {
    const ctl = withTimeout(15000)
    const res = await fetch(`${PINATA_URL}/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: getPinataHeaders(),
      signal: ctl.signal,
    })
    ctl.clear()
    return res.ok
  } catch (e) {
    console.error('Failed to unpin CID:', cid, e)
    return false
  }
}
