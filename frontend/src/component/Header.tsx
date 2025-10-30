import { Search, ShoppingBag, ChevronDown, Menu, X, ChevronRight, User, Package, LogOut, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from './Button'
import DonateLogo from '../assets/DonateLogo.png'
import { useCart } from '../context/CartContext'
import { addresses, abis } from '../onchain/contracts'
import { read as readOnchain } from '../onchain/client'
import { products, campaigns, causes, creators } from '../data/databank'
import { reownAppKit } from '../config/reownConfig'
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { hederaTestnet } from '../config/reownConfig'
import { getUserRoles } from '../onchain/adapter'

const Header = () => {
    const navigate = useNavigate()
    const { getCartItemCount } = useCart()
    const { address, isConnected } = useAccount()
    const { disconnect } = useDisconnect()
    const chainId = useChainId()
    const { switchChain } = useSwitchChain()
    const [isShopOpen, setIsShopOpen] = useState(false)
    const [shopEntered, setShopEntered] = useState(false)
    const [activeNav, setActiveNav] = useState<string>('')
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [showAdmin, setShowAdmin] = useState(false)
    const [isMobileShopOpen, setIsMobileShopOpen] = useState(false)
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
    const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isNgo, setIsNgo] = useState(false)

    useEffect(() => {
        const checkRoles = async () => {
            if (address && isConnected) {
                try {
                    const roles = await getUserRoles(address as `0x${string}`);
                    setIsNgo(roles.isNgo);
                } catch (error) {
                    console.error('Error checking roles in header:', error);
                }
            } else {
                setIsNgo(false);
            }
        };
        checkRoles();
    }, [address, isConnected]);

    const shortenAddress = (address: string) => {
        if (!address) return ''
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const handleShopItemClick = () => {
        setIsShopOpen(false)
        navigate('/shop')
    }

    const handleConnect = async () => {
        await reownAppKit.open() 
      }

    const handleSearch = (query: string) => {
        setSearchQuery(query)
        if (query.trim() === '') {
            setSearchResults([])
            return
        }
        
        const searchTerm = query.toLowerCase()
        
      
        const productResults = products.filter(product => 
            product.title.toLowerCase().includes(searchTerm) ||
            product.creator.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        ).map(p => ({ ...p, type: 'product' }))
        
      
        const campaignResults = campaigns.filter(campaign => 
            campaign.title.toLowerCase().includes(searchTerm) ||
            campaign.category.toLowerCase().includes(searchTerm) ||
            campaign.about.toLowerCase().includes(searchTerm)
        ).map(c => ({ ...c, type: 'campaign' }))
        
      
        const causeResults = causes.filter(cause => 
            cause.title.toLowerCase().includes(searchTerm) ||
            cause.organization.toLowerCase().includes(searchTerm)
        ).map(c => ({ ...c, type: 'cause' }))
        
     
        const creatorResults = creators.filter(creator => 
            creator.name.toLowerCase().includes(searchTerm) ||
            creator.role.toLowerCase().includes(searchTerm)
        ).map(c => ({ ...c, type: 'creator' }))
        
       
        const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]')
        const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]')
        const allDesigns = [...userDesigns, ...ngoDesigns]
        
        const designResults = allDesigns.filter((design: any) => 
            design.pieceName?.toLowerCase().includes(searchTerm) ||
            design.campaign?.toLowerCase().includes(searchTerm) ||
            design.description?.toLowerCase().includes(searchTerm) ||
            design.type?.toLowerCase().includes(searchTerm)
        ).map((d: any) => ({ ...d, type: 'design' }))
        
        const allResults = [...productResults, ...campaignResults, ...causeResults, ...creatorResults, ...designResults]
        setSearchResults(allResults)
    }

    const handleSearchResultClick = (item: any) => {
        setIsSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])
        
      
        switch (item.type) {
            case 'product':
                navigate(`/product/${item.id}`)
                break
            case 'campaign':
                navigate(`/campaign/${item.id}`)
                break
            case 'design':
                navigate(`/product/${item.id}`)
                break
            case 'cause':
               
                navigate('/campaign')
                break
            case 'creator':
             
                navigate('/')
                break
            default:
                navigate('/')
        }
    }

    const handleProfileClick = () => {
        setIsAccountMenuOpen(false)
        navigate('/user-profile')
    }

    const handleOrdersClick = () => {
        setIsAccountMenuOpen(false)
        
        console.log('Navigate to orders')
    }

    const handleSignOutClick = () => {
        setIsAccountMenuOpen(false)
        
        console.log('Sign out')
    }

    const handleDisconnect = () => {
        disconnect()
        setIsWalletMenuOpen(false)
        
      
        localStorage.removeItem('ngos')
        
        navigate('/')
    }

    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address)
            setIsWalletMenuOpen(false)
        }
    }

    const handleSwitchNetwork = (chainIdToSwitch: number) => {
        if (switchChain) {  
            switchChain({ chainId: chainIdToSwitch })
        }
    }

    const networks = [
      
        { id: hederaTestnet.id, name: 'Hedera Testnet' },
    ]

    useEffect(() => {
        if (isShopOpen) {
            const id = requestAnimationFrame(() => setShopEntered(true))
            return () => cancelAnimationFrame(id)
        } else {
            setShopEntered(false)
        }
    }, [isShopOpen])

    useEffect(() => {
        if (isSearchOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isSearchOpen])

    useEffect(() => {
       
        document.body.style.paddingTop = '72px' 
        
        return () => {
            document.body.style.paddingTop = '0'
        }
    }, [])

    useEffect(() => {
        const loadRole = async () => {
            try {
                if (!address) { setShowAdmin(false); return }
                const owner = await readOnchain<string>({ address: addresses.ADMIN_REGISTRY as `0x${string}`, abi: abis.AdminRegistry as any, functionName: 'owner' })
                if (owner && address && owner.toLowerCase() === address.toLowerCase()) { setShowAdmin(true); return }
                const isAdmin = await readOnchain<boolean>({ address: addresses.ADMIN_REGISTRY as `0x${string}`, abi: abis.AdminRegistry as any, functionName: 'isAdmin', args: [address] })
                setShowAdmin(Boolean(isAdmin))
            } catch {
                setShowAdmin(false)
            }
        }
        loadRole()
    }, [address])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isWalletMenuOpen && !(event.target as HTMLElement).closest('.wallet-menu')) {
                setIsWalletMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isWalletMenuOpen])

    return (
        <header className="fixed top-0 left-0 right-0 z-20 w-full bg-white px-4 md:px-7 py-[18px] flex items-center justify-between max-h-24">
            <div className="flex items-center gap-9">
                <div className="flex items-center gap-[10px]">
                    <img 
                        src={DonateLogo} 
                        alt="Donate" 
                        className="h-7 w-auto block cursor-pointer " 
                        onClick={() => navigate('/')}
                    />
                </div>
                <nav className="hidden md:flex items-center gap-9">
                    <button 
                        className={`inline-flex items-center gap-[6px] text-base text-black bg-transparent pb-1 cursor-pointer hover:opacity-80 border-b-2 transition-colors ${isShopOpen ? 'border-black' : 'border-transparent hover:border-black'}`}
                        onClick={() => { setIsShopOpen((v) => !v); setActiveNav('') }}
                        aria-expanded={isShopOpen}
                        aria-haspopup="true"
                    >
                        Shop
                        <ChevronDown size={18} />
                    </button>
                    <button 
                        className={`inline-flex items-center gap-[6px] text-base text-black bg-transparent pb-1 cursor-pointer hover:opacity-80 border-b-2 transition-colors ${activeNav==='How' ? 'border-black' : 'border-transparent hover:border-black'}`}
                        onClick={() => { setActiveNav('How'); setIsShopOpen(false); navigate('/how-it-works'); }}
                    >
                        How It Works
                    </button>
                    <button 
                        className={`inline-flex items-center gap-[6px] text-base text-black bg-transparent pb-1 cursor-pointer hover:opacity-80 border-b-2 transition-colors ${activeNav==='Campaigns' ? 'border-black' : 'border-transparent hover:border-black'}`}
                        onClick={() => { setActiveNav('Campaigns'); setIsShopOpen(false); navigate('/campaign'); }}
                    >
                        Campaigns
                    </button>
                    {!isNgo && (
                    <button 
                        className={`inline-flex items-center gap-[6px] text-base text-black bg-transparent pb-1 cursor-pointer hover:opacity-80 border-b-2 transition-colors ${activeNav==='Customize' ? 'border-black' : 'border-transparent hover:border-black'}`}
                        onClick={() => { setActiveNav('Customize'); setIsShopOpen(false); navigate('/become-an-ngo'); }}
                    >
                        Become an NGO
                    </button>
                    )}
                    {showAdmin && (
                        <button 
                            className={`inline-flex items-center gap-[6px] text-base text-black bg-transparent pb-1 cursor-pointer hover:opacity-80 border-b-2 transition-colors ${activeNav==='Admin' ? 'border-black' : 'border-transparent hover:border-black'}`}
                            onClick={() => { setActiveNav('Admin'); setIsShopOpen(false); navigate('/admin'); }}
                        >
                            Admin
                        </button>
                    )}
                </nav>
            </div>

            <div className="flex items-center gap-[12px] relative">
                <button 
                    aria-label="Search"
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer ${isSearchOpen ? 'bg-gray-300 text-black' : 'bg-transparent text-black hover:bg-gray-100'}`}
                    onClick={() => { setIsSearchOpen((v) => !v); setIsShopOpen(false) }}
                    aria-expanded={isSearchOpen}
                >
                    <Search size={18} />
                </button>
                <button 
                    aria-label="Cart"
                    className="relative z-30 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-transparent border-none text-black cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate('/cart')}
                >
                    <ShoppingBag size={22} />
                    {getCartItemCount() > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {getCartItemCount()}
                        </span>
                    )}
                </button>
                <div className="relative z-30 hidden md:block">
                    {!isConnected ? (
                        <Button 
                            variant="primary" 
                            size="md"
                            onClick={handleConnect}
                        >
                            Connect Wallet
                        </Button>
                    ) : (
                        <div className="relative wallet-menu">
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                                className="gap-2"
                            >
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {address ? address.slice(2, 4).toUpperCase() : '0x'}
                                </div>
                                <span className="font-medium">{shortenAddress(address as string)}</span>
                                <ChevronDown size={16} className={`transition-transform ${isWalletMenuOpen ? 'rotate-180' : ''}`} />
                            </Button>
                            
                            {isWalletMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 w-64 z-50">
                                    <div className="p-4 border-b border-gray-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                {address ? address.slice(2, 4).toUpperCase() : '0x'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600">Connected</p>
                                                <p className="text-xs text-gray-500 truncate">{address}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Network</p>
                                            <select
                                                value={chainId}
                                                onChange={(e) => handleSwitchNetwork(Number(e.target.value))}
                                                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {networks.map((network) => (
                                                    <option key={network.id} value={network.id}>
                                                        {network.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <button
                                            onClick={handleCopyAddress}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
                                        >
                                            <Copy size={18} className="text-gray-600" />
                                            <span>Copy Address</span>
                                        </button>
                                        <button
                                            onClick={handleProfileClick}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
                                        >
                                            <User size={18} className="text-gray-600" />
                                            <span>Profile</span>
                                        </button>
                                        <button
                                            onClick={handleOrdersClick}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
                                        >
                                            <Package size={18} className="text-gray-600" />
                                            <span>Orders</span>
                                        </button>
                                        <hr className="my-2 border-gray-200" />
                                        <button
                                            onClick={handleDisconnect}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 text-red-600"
                                        >
                                            <LogOut size={18} />
                                            <span>Disconnect</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button 
                    aria-label="Menu"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-transparent text-black md:hidden"
                    onClick={() => { setIsMobileMenuOpen((v)=>!v); setIsShopOpen(false); setIsSearchOpen(false) }}
                >
                    {isMobileMenuOpen ? <X size={22}/> : <Menu size={22}/>} 
                </button>

            </div>

     
            {isSearchOpen && <div className="fixed inset-x-0 top-20 bottom-0 z-10 bg-black bg-opacity-20 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />}
           
            {isSearchOpen && (
                <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 z-20 bg-white text-black rounded-lg shadow-xl w-[640px] max-w-[calc(100vw-56px)] overflow-hidden">
                    <div className="relative h-14 flex items-center justify-center pl-14 pr-14 border-b border-gray-200">
                        <Search size={20} className="absolute left-5 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="What Are You Searching For" 
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-transparent text-center text-black placeholder-gray-500 text-[16px] outline-none"
                            autoFocus={isSearchOpen}
                        />
                    </div>
                    
                   
                    {searchResults.length > 0 && (
                        <div className="max-h-80 overflow-y-auto">
                            {searchResults.map((item, index) => (
                                <div 
                                    key={item.id ? `${item.type}-${item.id}` : `item-${index}`}
                                    className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                    onClick={() => handleSearchResultClick(item)}
                                >
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.image && (
                                            <img 
                                                src={item.image} 
                                                alt={item.title || item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-blue-600 px-2 py-0.5 bg-blue-50 rounded">
                                                {item.type?.toUpperCase()}
                                            </span>
                                            <h3 className="font-medium text-black">{item.title || item.pieceName || item.name}</h3>
                                        </div>
                                        {item.creator && (
                                            <p className="text-sm text-gray-600">By {item.creator}</p>
                                        )}
                                        {item.organization && (
                                            <p className="text-sm text-gray-600">{item.organization}</p>
                                        )}
                                        {item.role && (
                                            <p className="text-sm text-gray-600">{item.role}</p>
                                        )}
                                        {item.campaign && (
                                            <p className="text-sm text-gray-500">Campaign: {item.campaign}</p>
                                        )}
                                        {(item.category || item.categoryType) && (
                                            <p className="text-sm text-gray-500">{item.category || item.categoryType}</p>
                                        )}
                                    </div>
                                    {(item.price || item.amountRaised) && (
                                        <div className="text-right">
                                            <p className="font-medium text-black">{item.price || item.amountRaised}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {searchQuery && searchResults.length === 0 && (
                        <div className="p-4 text-center text-gray-500">
                            No results found for "{searchQuery}"
                        </div>
                    )}
                </div>
            )}

          
            {isShopOpen && (
                <>
              
                <div className="fixed inset-0 z-10" onClick={() => setIsShopOpen(false)} />
                <div className={`absolute left-16 top-full mt-3 z-20 bg-black text-white rounded-2xl shadow-xl w-[420px] max-w-[calc(100vw-56px)] pl-10 pr-6 py-6 transition-all duration-200 ease-in transform ${shopEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <h4 className="text-gray-300 text-lg mb-4">Collections</h4>
                            <ul className="space-y-5 text-xl">
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Shirts</button></li>
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Caps</button></li>
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Hoodies</button></li>
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Sweaters</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-gray-300 text-lg mb-4">Collections</h4>
                            <ul className="space-y-5 text-xl">
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Fundraisers</button></li>
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Bestsellers</button></li>
                                <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-300 transition-colors">Creator's Choice</button></li>
                            </ul>
                        </div>
                    </div>
                </div>
                </>
            )}

            {isMobileMenuOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute left-0 top-full z-20 w-full bg-white text-black px-4 py-6 shadow-xl md:hidden">
                        <ul className="divide-y divide-black/10 text-xl">
                            <li>
                                <button className="w-full flex items-center justify-between py-5" onClick={() => setIsMobileShopOpen(!isMobileShopOpen)}>
                                    <span>Shop</span>
                                    <ChevronRight size={18} className={`transition-transform ${isMobileShopOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isMobileShopOpen && (
                                    <div className="pl-4 pb-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <h4 className="text-gray-500 text-sm mb-2 font-medium">Collections</h4>
                                                <ul className="space-y-2 text-base">
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Shirts</button></li>
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Caps</button></li>
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Hoodies</button></li>
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Sweaters</button></li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="text-gray-500 text-sm mb-2 font-medium">Categories</h4>
                                                <ul className="space-y-2 text-base">
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Fundraisers</button></li>
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Bestsellers</button></li>
                                                    <li><button onClick={() => handleShopItemClick()} className="hover:text-gray-600 transition-colors">Creator's Choice</button></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </li>
                            <li>
                                <button className="w-full flex items-center justify-between py-5" onClick={() => { setIsMobileMenuOpen(false); setActiveNav('How'); navigate('/how-it-works'); }}>
                                    <span>How It Works</span>
                                </button>
                            </li>
                            <li>
                                <button className="w-full flex items-center justify-between py-5" onClick={() => { setIsMobileMenuOpen(false); setActiveNav('Campaigns'); navigate('/campaign'); }}>
                                    <span>Campaigns</span>
                                    
                                </button>
                            </li>
                            {!isNgo && (
                            <li>
                                <button className="w-full flex items-center justify-between py-5" onClick={() => { setIsMobileMenuOpen(false); setActiveNav('Customize'); navigate('/become-an-ngo'); }}>
                                    <span>Become an NGO</span>
                                </button>
                            </li>
                            )}
                        </ul>
                        <div className="pt-6">
                            {!isConnected ? (
                                <Button 
                                    variant="primary" 
                                    size="md" 
                                    className="w-full justify-center"
                                    onClick={handleConnect}
                                >
                                    Connect Wallet
                                </Button>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                            {address ? address.slice(2, 4).toUpperCase() : '0x'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600">Connected</p>
                                            <p className="text-xs text-gray-500 truncate">{address}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Network</p>
                                        <select
                                            value={chainId}
                                            onChange={(e) => handleSwitchNetwork(Number(e.target.value))}
                                            className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {networks.map((network) => (
                                                <option key={network.id} value={network.id}>
                                                    {network.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                                        <button
                                            onClick={() => {
                                                handleCopyAddress()
                                                setIsMobileMenuOpen(false)
                                            }}
                                            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Copy
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false)
                                                handleProfileClick()
                                            }}
                                            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Profile
                                        </button>
                                        <button
                                            onClick={handleDisconnect}
                                            className="flex-1 px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

           
            {isAccountMenuOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsAccountMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-3 z-20 bg-white text-black rounded-lg shadow-xl w-48 border border-gray-200">
                        <div className="py-2">
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                onClick={handleProfileClick}
                            >
                                <User size={18} className="text-gray-600" />
                                <span className="text-sm font-medium">Profile</span>
                            </button>
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                onClick={handleOrdersClick}
                            >
                                <Package size={18} className="text-gray-600" />
                                <span className="text-sm font-medium">Orders</span>
                            </button>
                            <hr className="my-1 border-gray-200" />
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors text-red-600"
                                onClick={handleSignOutClick}
                            >
                                <LogOut size={18} />
                                <span className="text-sm font-medium">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </header>
    )
}

export default Header