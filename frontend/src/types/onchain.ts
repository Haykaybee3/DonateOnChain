export type HexAddress = `0x${string}`

export type Campaign = {
  id: bigint
  title: string
  description: string
  goalHBAR: bigint
  ngo: HexAddress
  designer?: HexAddress
  image?: string
}

export type Design = {
  id: bigint
  title: string
  priceHBAR: bigint
  campaignId: bigint
  designer: HexAddress
  image?: string
}

export type NgoProfile = {
  owner: HexAddress
  name: string
  description?: string
  image?: string
}

export type DesignerProfile = {
  owner: HexAddress
  name: string
  bio?: string
  image?: string
}

export type UserRoles = {
  isAdmin: boolean
  isNgo: boolean
  isDesigner: boolean
}



