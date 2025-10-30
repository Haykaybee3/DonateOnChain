import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { defineChain, http } from 'viem'
import { createConfig, injected } from 'wagmi'


export const hederaTestnet = defineChain({
  id: 296, 
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: { http: ['https://testnet.hashio.io/api'] },
    public: { http: ['https://testnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'HashScan', url: 'https://hashscan.io/testnet' },
  },
  testnet: true,
})


const projectId = '76aec883a60155fae2012fbcb508a430'


const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [hederaTestnet],
  transports: {
    [hederaTestnet.id]: http('https://testnet.hashio.io/api'),
  },
})

export const reownAppKit = createAppKit({
  adapters: [wagmiAdapter as any],
  projectId,
  networks: [hederaTestnet] as any,
  themeMode: 'light',
  metadata: {
    name: 'DonateOnchain',
    description: 'Web3 Donation Platform',
    url: 'https://donateonchain.com',
    icons: ['https://donateonchain.com/logo.png'],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
    emailShowWallets: true,
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
  ],
})


export const wagmiConfig = createConfig({
  chains: [hederaTestnet],
  transports: {
    [hederaTestnet.id]: http('https://testnet.hashio.io/api'),
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
})
