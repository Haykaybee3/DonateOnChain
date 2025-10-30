import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import Header from "../component/Header"
import Footer from "../component/Footer"
import Button from "../component/Button"
import { useCart } from '../context/CartContext'
import { products } from '../data/databank'
import { useAccount } from 'wagmi'
import { reownAppKit } from '../config/reownConfig'
import { saveDonation, getAllGlobalDesigns, saveOrder } from '../utils/firebaseStorage'
import { getDesignPrice, batchPurchaseDesignsPayable } from '../onchain/adapter'

const Checkout = () => {
    const navigate = useNavigate()
    const { cartItems, clearCart, removeItem } = useCart()
    const { isConnected, address, connector } = useAccount()
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showConnectWalletModal, setShowConnectWalletModal] = useState(false)
    const [showOwnDesignError, setShowOwnDesignError] = useState(false)
    const [customDesigns, setCustomDesigns] = useState<any[]>([])
    const [formData, setFormData] = useState({
        email: '', firstName: '', lastName: '', country: 'Nigeria', city: '', address: '', paymentMethod: ''
    })
   
    useEffect(() => {
        const loadDesigns = async () => {
            try {
                const firebaseDesigns = await getAllGlobalDesigns();
                const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]')
                const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]')
                const allDesigns = [...firebaseDesigns, ...userDesigns, ...ngoDesigns];
                const uniqueDesigns = Array.from(new Map(allDesigns.map(design => [design.id, design])).values());
                setCustomDesigns(uniqueDesigns);
            } catch (error) {
                const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]')
                const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]')
                setCustomDesigns([...userDesigns, ...ngoDesigns])
            }
        }
        loadDesigns()
    }, [])

    const getProductById = (id: number) => {
        const regularProduct = products.find(product => product.id === id)
        if (regularProduct) return regularProduct
        const customDesign = customDesigns.find((design: any) => design.id === id)
        return customDesign
    }

    const checkIfOwnDesign = () => {
        if (!isConnected || !address) return false
        return cartItems.some(item => {
            const customDesign = customDesigns.find((design: any) => design.id === item.id)
            if (customDesign) {
                return customDesign.walletAddress?.toLowerCase() === address.toLowerCase() || customDesign.connectedWalletAddress?.toLowerCase() === address.toLowerCase()
            }
            return false
        })
    }

    const isMyProduct = (itemId: number) => {
        if (!isConnected || !address) return false
        const customDesign = customDesigns.find((design: any) => design.id === itemId)
        if (customDesign) {
            return customDesign.walletAddress?.toLowerCase() === address.toLowerCase() || customDesign.connectedWalletAddress?.toLowerCase() === address.toLowerCase()
        }
        return false
    }

    const getConnectedPaymentMethod = () => {
        if (!isConnected || !connector) return null
        const connectorName = connector.name.toLowerCase()
        if (connectorName.includes('metamask') || connectorName.includes('meta')) return 'metamask'
        if (connectorName.includes('hashpack')) return 'hashpack'
        return 'metamask'
    }

    const isPaymentMethodConnected = (paymentMethod: string) => { return isConnected && getConnectedPaymentMethod() === paymentMethod }

    const calculateSubtotal = () => {
        return cartItems.reduce((total, item) => {
            const product = getProductById(item.id)
            if (product) {
                let price
                if (product.pieceName) { price = parseInt(product.price.toString().replace(/[^\d]/g, '')) }
                else if (product.price) { price = parseInt(product.price.replace(/[^\d]/g, '')) }
                else { price = 0 }
                return total + (price * item.quantity)
            }
            return total
        }, 0)
    }

    const shippingCost = 4000
    const subtotal = calculateSubtotal()
    const total = subtotal + shippingCost

    const formatPrice = (amount: number) => { return `₦${amount.toLocaleString()}` }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePaymentMethodSelect = async (method: string) => {
        if (!isConnected) { setShowConnectWalletModal(true); return }
        setFormData(prev => ({ ...prev, paymentMethod: method }))
    }

    useEffect(() => {
        if (isConnected && !formData.paymentMethod) {
            const connectedMethod = getConnectedPaymentMethod()
            setFormData(prev => ({ ...prev, paymentMethod: connectedMethod || 'metamask' }))
        }
    }, [isConnected, formData.paymentMethod])

    const handleConnectWallet = async () => { setShowConnectWalletModal(false); await reownAppKit.open() }

    const handleCheckout = async () => {
        if (!isFormValid()) return
        if (!isConnected) { setShowConnectWalletModal(true); return }
        if (checkIfOwnDesign()) { setShowOwnDesignError(true); return }
        setIsProcessing(true)
        if (!address) { setIsProcessing(false); return }

        const donations: any[] = []
        const designCartItems = cartItems.filter((item) => { const product = getProductById(item.id); return !!product?.pieceName })
        cartItems.forEach((item) => {
            const product = getProductById(item.id)
            if (!product) return
            const price = product.price
            if (item.campaign) {
                donations.push({ itemId: item.id, itemName: product.title || product.pieceName, campaign: item.campaign, amount: price, date: new Date().toISOString(), donorAddress: address })
            }
        })
        
        try {
            const items = designCartItems.map(it => ({ designId: BigInt(it.id), quantity: it.quantity }))
            for (const it of items) { await getDesignPrice(it.designId) }
            const receipt = await batchPurchaseDesignsPayable(items)
            const txHashes: string[] = Array.isArray(receipt) ? receipt.map((r: any) => r?.transactionHash || r?.hash).filter(Boolean) : [ (receipt as any)?.transactionHash || (receipt as any)?.hash ].filter(Boolean)
            for (const donation of donations) { await saveDonation(address, donation) }
            if (txHashes.length > 0) {
                const orderItems = designCartItems.map((it) => ({ id: it.id, quantity: it.quantity }))
                await saveOrder({ buyer: address, items: orderItems, totalHBAR: 'batch', txHashes })
            }
        } catch (error) {
            console.error('Checkout error:', error)
        }

        clearCart(); setIsProcessing(false); setShowSuccessModal(true)
    }

    const handleCloseModal = () => { setShowSuccessModal(false); navigate('/') }

    const isFormValid = () => { return formData.email && formData.firstName && formData.lastName && formData.city && formData.address && formData.paymentMethod }

    return (
        <div>
            <Header />
            <section className="px-4 md:px-7 py-12">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <h1 className="text-3xl font-bold text-black mb-8">Checkout</h1>
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-black mb-4">Contact Information</h2>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address *" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
                            </div>
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-black mb-4">Shipping Address</h2>
                                <div className="relative mb-4">
                                    <select name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent">
                                        <option value="Nigeria">Nigeria</option>
                                        <option value="Ghana">Ghana</option>
                                        <option value="Kenya">Kenya</option>
                                        <option value="South Africa">South Africa</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name *" required className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name *" required className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
                                </div>
                                <div className="mb-4"><input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="City *" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" /></div>
                                <div className="mb-4"><input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Address *" required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" /></div>
                            </div>
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-black mb-4">Payment Method</h2>
                                <div className="space-y-4">
                                    <div className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === 'metamask' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}`}>
                                        <span className="text-black font-medium">Metamask *</span>
                                        <Button variant={isPaymentMethodConnected('metamask') ? "secondary" : "primary-bw"} size="sm" onClick={() => handlePaymentMethodSelect('metamask')}>{isPaymentMethodConnected('metamask') ? 'Connected' : 'Connect Wallet'}</Button>
                                    </div>
                                    <div className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === 'hashpack' ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}`}>
                                        <span className="text-black font-medium">Hashpack *</span>
                                        <Button variant={isPaymentMethodConnected('hashpack') ? "secondary" : "primary-bw"} size="sm" onClick={() => handlePaymentMethodSelect('hashpack')}>{isPaymentMethodConnected('hashpack') ? 'Connected' : 'Connect Wallet'}</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-black mb-8">Overview</h2>
                            <div className="space-y-4">
                                {cartItems.length > 0 ? (
                                    cartItems.map((item, index) => {
                                        const product = getProductById(item.id)
                                        if (!product) return null
                                        const isMyOwnProduct = isMyProduct(item.id)
                                        return (
                                            <div key={`${item.id}-${index}`} className={`flex items-center gap-4 py-4 border-b ${isMyOwnProduct ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-lg px-3`}>
                                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                    {product.pieceName ? (
                                                        <>
                                                            <img src="/shirtfront.png" alt="Shirt Mockup" className="w-full h-full object-cover" style={{ filter: (product as any).color === '#FFFFFF' ? 'none' : (product as any).color === '#000000' ? 'brightness(0)' : 'none' }} />
                                                            {(product.frontDesign?.dataUrl || product.frontDesign?.url) && (
                                                                <div className="absolute" style={{ width: '65%', height: 'auto', maxWidth: '36px', maxHeight: '50px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                                    <img src={product.frontDesign?.url || product.frontDesign?.dataUrl} alt="Design" className="w-full h-full object-contain" />
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                    <img src={(product as any).image} alt={(product as any).title} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-black">{(product as any).pieceName || (product as any).title}</h3>
                                                    <p className="text-sm text-gray-600">{item.color} {item.size}</p>
                                                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                                                    {isMyOwnProduct && (<p className="text-sm text-red-600 font-medium mt-1">Your Design</p>)}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                        <p className="font-medium text-black">{formatPrice((product.pieceName ? parseInt((product as any).price.toString().replace(/[^\d]/g, '')) : parseInt((product as any).price.replace(/[^\d]/g, ''))) * item.quantity)}</p>
                                                    </div>
                                                    <button onClick={() => removeItem(item.uniqueId)} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="Remove item"><X size={20} className="text-gray-600" /></button>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 text-gray-500"><p>No items in cart</p></div>
                                )}
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-300">
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between"><span className="text-black">Subtotal</span><span className="text-black font-medium">{formatPrice(subtotal)}</span></div>
                                    <div className="flex justify-between"><span className="text-black">Shipping</span><span className="text-black font-medium">{formatPrice(shippingCost)}</span></div>
                                    </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-300"><span className="text-2xl font-bold text-black">Total</span><span className="text-2xl font-bold text-black">{formatPrice(total)}</span></div>
                            </div>
                            <div className="mt-8">
                                {!isConnected && (<div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800">Please connect your wallet to complete the order.</p></div>)}
                                {isConnected && checkIfOwnDesign() && (<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-800">You cannot purchase your own created design. Please remove it from your cart.</p></div>)}
                                <Button variant="primary-bw" size="lg" className="w-full" onClick={handleCheckout} disabled={!isFormValid() || isProcessing || !isConnected || checkIfOwnDesign()}>{isProcessing ? 'Processing...' : 'Complete Order'}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {isProcessing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-2">Processing Your Order</h2>
                        <p className="text-gray-600">Please wait while we process your payment and create your order...</p>
                    </div>
                </div>
            )}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-2">Order Created Successfully!</h2>
                        <p className="text-gray-600 mb-6">Thank you for your purchase.</p>
                        <Button variant="primary-bw" size="lg" className="w-full" onClick={handleCloseModal}>Continue Shopping</Button>
                    </div>
                </div>
            )}
            {showConnectWalletModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowConnectWalletModal(false)}>
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center"><svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                        <h2 className="text-2xl font-bold text-black mb-2">Connect Your Wallet</h2>
                        <p className="text-gray-600 mb-6">Please connect your wallet to continue with the checkout process.</p>
                        <div className="space-y-3">
                            <Button variant="primary-bw" size="lg" className="w-full" onClick={handleConnectWallet}>Connect Wallet</Button>
                            <Button variant="secondary" size="lg" className="w-full" onClick={() => setShowConnectWalletModal(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
            {showOwnDesignError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowOwnDesignError(false)}>
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center"><svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></div>
                        <h2 className="text-2xl font-bold text-black mb-2">Cannot Checkout Own Design</h2>
                        <p className="text-gray-600 mb-6">You cannot purchase your own created design.</p>
                        <Button variant="primary-bw" size="lg" className="w-full" onClick={() => setShowOwnDesignError(false)}>OK, I understand</Button>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    )
}

export default Checkout
