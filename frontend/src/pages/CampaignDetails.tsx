import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import Header from '../component/Header'
import Footer from '../component/Footer'
import Banner from '../component/Banner'
import CampaignCard from '../component/CampaignCard'
import Button from '../component/Button'
import EditCampaignModal from '../component/EditCampaignModal'
import { Loader2, Check, Gift } from 'lucide-react'
import { campaigns as defaultCampaigns } from '../data/databank'
import { getAllCampaigns, saveCampaign } from '../utils/firebaseStorage'
import { donate, getCampaign as onchainGetCampaign, getDonationsByCampaign } from '../onchain/adapter'

const CampaignDetails = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { address, isConnected } = useAccount()
    const [donationAmount, setDonationAmount] = useState<string>('')
    const [campaign, setCampaign] = useState<any>(null)
    const [allCampaigns, setAllCampaigns] = useState<any[]>([])
    const [isCampaignCreator, setIsCampaignCreator] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isUploadingCampaign, setIsUploadingCampaign] = useState(false)
    const [isCampaignUpdated, setIsCampaignUpdated] = useState(false)
    const [isDonating, setIsDonating] = useState(false)
    const [donationSuccess, setDonationSuccess] = useState(false)
    const [donationError, setDonationError] = useState<string | null>(null)
    const [txHash, setTxHash] = useState<string | null>(null)

    useEffect(() => {
        const loadCampaign = async () => {
            try {
                const firebaseCampaigns = await getAllCampaigns()
                const fallback = [...firebaseCampaigns, ...defaultCampaigns]
                let found = fallback.find(c => 
                    c.id === parseInt(id || '1') || 
                    c.id?.toString() === id || 
                    c.onchainId === parseInt(id || '1') ||
                    c.onchainId?.toString() === id
                )
                try {
                    const numericId = BigInt(id || '0')
                    const chainCampaign = await onchainGetCampaign(numericId)
                    let amountRaised = found?.amountRaised || 0
                    try {
                        const donations = await getDonationsByCampaign(numericId)
                        amountRaised = donations.totalRaisedHBAR
                    } catch {}
                    found = {
                        ...found,
                        id: Number(numericId),
                        onchainId: Number(numericId),
                        title: chainCampaign.title || found?.title,
                        description: chainCampaign.description || found?.description,
                        goal: Number(chainCampaign.goalHBAR) / 1e18,
                        ngoWallet: chainCampaign.ngo,
                        image: chainCampaign.image || found?.image,
                        amountRaised,
                        percentage: 0,
                        ngoName: found?.ngoName,
                        active: chainCampaign.active ?? true,
                    }
                    const goal = found.goal || 0
                    found.percentage = goal > 0 ? (amountRaised / goal) * 100 : 0
                } catch {}
                setCampaign(found)
                setAllCampaigns(fallback.filter(c => (c.id !== parseInt(id || '1') && c.id?.toString() !== id)))
            } catch (error) {
                console.error('Error loading campaign:', error)
               
                const foundCampaign = defaultCampaigns.find(c => c.id === parseInt(id || '1'))
                setCampaign(foundCampaign)
                setAllCampaigns(defaultCampaigns.filter(c => c.id !== foundCampaign?.id))
            }
        }
        
        loadCampaign()
    }, [id])

    
    useEffect(() => {
        if (campaign && address && isConnected) {
            const isCreator = campaign.ngoWallet?.toLowerCase() === address.toLowerCase() ||
                             campaign.walletAddress?.toLowerCase() === address.toLowerCase()
            setIsCampaignCreator(isCreator)
            console.log('Is campaign creator:', isCreator)
        } else {
            setIsCampaignCreator(false)
        }
    }, [campaign, address, isConnected])

    if (!campaign) {
        return (
            <div>
                <Header />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold mb-4">Campaign not found</h1>
                        <button 
                            onClick={() => navigate('/campaign')}
                            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        )
    }

    const handleDonate = async () => {
        if (!donationAmount.trim() || !isConnected) return
        const value = parseFloat(donationAmount)
        if (Number.isNaN(value) || value <= 0) {
            setDonationError('Please enter a valid amount')
            return
        }
        
        setIsDonating(true)
        setDonationError(null)
        setDonationSuccess(false)
        setTxHash(null)
        
        try {
            const campaignIdForChain = campaign?.onchainId ? BigInt(campaign.onchainId) : (campaign?.id ? BigInt(campaign.id) : BigInt(id || '0'))
            const receipt = await donate({ campaignId: campaignIdForChain, valueHBAR: value })
            setTxHash(receipt.transactionHash)
            setDonationSuccess(true)
            setDonationAmount('')
            
            const numericId = BigInt(id || '0')
            const donations = await getDonationsByCampaign(numericId)
            const goal = campaign.goal || campaign.target || 0
            const updatedAmountRaised = donations.totalRaisedHBAR
            const updatedPercentage = goal > 0 ? (updatedAmountRaised / goal) * 100 : 0
            
            setCampaign({
                ...campaign,
                amountRaised: updatedAmountRaised,
                percentage: updatedPercentage
            })
            
            setTimeout(() => {
                setDonationSuccess(false)
                setTxHash(null)
            }, 5000)
        } catch (e: any) {
            console.error('Donation failed', e)
            setDonationError(e?.message || 'Donation failed. Please try again.')
            setTimeout(() => {
                setDonationError(null)
            }, 5000)
        } finally {
            setIsDonating(false)
        }
    }

    return (
        <div>
            <Header />
            
          
            <section className="px-4 md:px-7 py-12">
                <div className="max-w-4xl mx-auto">
                
                    <div className="mb-8">
                        <img
                            src={campaign.image || campaign.coverImageFile || '/src/assets/Clothimg.png'}
                            alt={campaign.title}
                            className="w-full h-[400px] object-cover rounded-3xl"
                        />
                    </div>

                 
                    <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
                        {campaign.title}
                    </h1>

                  
                    {campaign.ngoName && (
                        <div className="mb-6">
                            <p className="text-base text-gray-600">
                                Created by: <span className="font-semibold text-black">{campaign.ngoName}</span>
                            </p>
                        </div>
                    )}

                  
                    <div className="mb-12">
                        {(() => {
                            const goal = Number(campaign.goal || campaign.target || 0)
                            const amountRaised = Number(campaign.amountRaised || 0)
                            const percentage = campaign.percentage || (goal > 0 ? (amountRaised / goal) * 100 : 0)
                            return (
                                <>
                                    <div className="relative h-16 rounded-full overflow-hidden bg-white border-2 border-gray-300">
                                      
                                        <div 
                                            className="absolute inset-0 bg-[#4ADE80] rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            
                                            <div className="absolute left-0 top-0 h-full flex items-center px-6 min-w-fit">
                                                <span className="text-xl font-semibold text-black whitespace-nowrap">{amountRaised.toFixed(2)} HBAR</span>
                                            </div>
                                        </div>
                                        
                                        
                                        <div className="absolute right-6 top-0 h-full flex items-center z-10">
                                            <span className="text-xl font-semibold text-black">{percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    
                                  
                                    <div className="mt-2 text-right">
                                        <span className="text-base text-gray-600">of {goal.toFixed(2)} HBAR</span>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                  
                    <div className="mb-12">
                        {isCampaignCreator && isConnected ? (
                            <Button 
                                variant="primary-bw"
                                size="lg"
                                onClick={() => setIsEditModalOpen(true)}
                                className="w-full rounded-lg py-4 text-lg"
                            >
                                Edit Campaign
                            </Button>
                        ) : (
                            <>
                                {campaign.active === false && (
                                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            ⚠️ This campaign is currently inactive. Donations are not being accepted at this time.
                                        </p>
                                    </div>
                                )}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-black mb-2">
                                        Enter Amount (HBAR)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-500">HBAR</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={donationAmount}
                                            onChange={(e) => setDonationAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#4ADE80] focus:border-transparent"
                                            disabled={!isConnected || isDonating || campaign.active === false}
                                        />
                                    </div>
                                    {donationError && (
                                        <p className="mt-2 text-sm text-red-600">{donationError}</p>
                                    )}
                                </div>
                                <Button 
                                    variant="primary-bw"
                                    size="lg"
                                    onClick={handleDonate}
                                    className="w-full rounded-lg py-4 text-lg"
                                    disabled={!donationAmount.trim() || !isConnected || isDonating || campaign.active === false}
                                >
                                    {isDonating ? 'Processing Donation...' : campaign.active === false ? 'Campaign Inactive' : isConnected ? 'Make Donation' : 'Connect Wallet to Donate'}
                                </Button>
                                {!isConnected && campaign.active !== false && (
                                    <p className="mt-2 text-sm text-gray-600 text-center">
                                        Connect your wallet to make a donation and receive a proof-of-donation NFT
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                  
                    <div className="space-y-6 mb-12">
                     
                        <div>
                            <h2 className="text-xl font-semibold text-black mb-3">About Campaign</h2>
                            <p className="text-base text-gray-700 leading-relaxed">
                                {campaign.about || campaign.description || 'No description available.'}
                            </p>
                        </div>

                        {campaign.howItWorks && (
                            <div>
                                <h2 className="text-xl font-semibold text-black mb-3">How It Works</h2>
                                <p className="text-base text-gray-700 leading-relaxed">
                                    {campaign.howItWorks}
                                </p>
                            </div>
                        )}

                        {campaign.useOfFunds && (
                            <div>
                                <h2 className="text-xl font-semibold text-black mb-3">Use Of Funds</h2>
                                <p className="text-base text-gray-700 leading-relaxed">
                                    {campaign.useOfFunds}
                                </p>
                            </div>
                        )}
                    </div>

                   
                </div>
            </section>

          
            <section className="px-4 md:px-7 py-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-black mb-8">
                        You may also like
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {allCampaigns.slice(0, 5).map((relatedCampaign) => {
                        const goal = relatedCampaign.goal || relatedCampaign.target || 0
                        const amountRaised = relatedCampaign.amountRaised || 0
                        const percentage = relatedCampaign.percentage || (goal > 0 ? (amountRaised / goal) * 100 : 0)
                        
                        return (
                            <CampaignCard
                                key={relatedCampaign.id}
                                image={relatedCampaign.image || relatedCampaign.coverImageFile}
                                title={relatedCampaign.title}
                                amountRaised={amountRaised}
                                goal={goal}
                                percentage={percentage}
                                alt={relatedCampaign.title}
                                onClick={() => navigate(`/campaign/${relatedCampaign.id}`)}
                            />
                        )
                    })}
                    </div>
            </section>

            <Banner />
            <Footer />
            
            
            {campaign && isEditModalOpen && (
                <EditCampaignModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    campaign={campaign}
                    onSubmit={async (campaignData: any) => {
                        setIsUploadingCampaign(true)
                        try {
                            const updatedCampaign = {
                                ...campaign,
                                title: campaignData.campaignTitle || campaign.title,
                                category: campaignData.category ? campaignData.category.toLowerCase().replace(/\s+/g, '-') : campaign.category,
                                description: campaignData.description || campaign.description,
                                goal: campaignData.target || campaign.goal,
                                coverImageFile: campaignData.coverImageFile,
                                ngoName: campaign.ngoName,
                                ngoWallet: campaign.ngoWallet,
                                amountRaised: campaign.amountRaised,
                                percentage: campaign.percentage,
                                createdAt: campaign.createdAt
                            }
                            
                            await saveCampaign(updatedCampaign)
                            console.log('Campaign updated successfully')
                            
                           
                            await new Promise(resolve => setTimeout(resolve, 1000))
                            
                         
                            const allCampaigns = await getAllCampaigns()
                            const updated = allCampaigns.find((c: any) => 
                                c.id === campaign.id || c.id?.toString() === campaign.id?.toString() || c.id?.toString() === id
                            )
                            if (updated) {
                                setCampaign(updated)
                            }
                            
                            setIsUploadingCampaign(false)
                            setIsEditModalOpen(false)
                            setIsCampaignUpdated(true)
                            setTimeout(() => {
                                setIsCampaignUpdated(false)
                            }, 3000)
                        } catch (error) {
                            console.error('Error updating campaign:', error)
                            setIsUploadingCampaign(false)
                        }
                    }}
                />
            )}
            
          
            {isUploadingCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-bold mb-2">Updating Campaign</h2>
                        <p className="text-gray-600">Please wait while we update your campaign...</p>
                    </div>
                </div>
            )}
            
          
            {isCampaignUpdated && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Campaign Updated!</h2>
                        <p className="text-gray-600">Your campaign has been successfully updated.</p>
                    </div>
                </div>
            )}
            
            {isDonating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-bold mb-2">Processing Donation</h2>
                        <p className="text-gray-600">Please wait while we process your donation...</p>
                    </div>
                </div>
            )}
            
            {donationSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Gift className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Donation Successful!</h2>
                        <p className="text-gray-600 mb-4">Your donation has been processed. A proof-of-donation NFT has been minted to your wallet.</p>
                        {txHash && (
                            <p className="text-sm text-gray-500 mb-4 break-all">
                                Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                            </p>
                        )}
                        <p className="text-sm text-gray-600">
                            Funds have been automatically split: 70% to NGO, 20% to Designer, 10% to Platform
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CampaignDetails
