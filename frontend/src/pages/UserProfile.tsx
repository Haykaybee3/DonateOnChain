import Header from "../component/Header";
import Footer from "../component/Footer";
import Button from "../component/Button";
import { SkeletonProfile } from "../component/Skeleton";
import { Plus, X, Camera, Copy, Check, Loader2, XCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { getUserDesigns, saveUserProfileWithImages, getUserProfile, migrateDesignImagesToFirebase, getOrdersByWallet } from '../utils/firebaseStorage';
import { getUserProofNFTs } from '../onchain/adapter';
import { getUserRoles, createCampaignByNGO } from '../onchain/adapter';
import { listAllCampaignsFromChain } from '../onchain/adapter';
import CreateCampaignModal from '../component/CreateCampaignModal';
import { uploadFileToIPFS, uploadMetadataToIPFS } from '../utils/ipfs';
import { keccak256, stringToHex } from 'viem';
import { storeHashViaRelayer } from '../utils/relayer';

const UserProfile = () => {
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();
    const [activeCategory, setActiveCategory] = useState<'NFTs' | 'History' | 'Created' | 'Campaigns'>('NFTs');
    const [myNfts, setMyNfts] = useState<Array<{ tokenId: bigint; tokenURI?: string; image?: string }>>([]);
    const [isLoadingNfts, setIsLoadingNfts] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [createdDesigns, setCreatedDesigns] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        bio: '',
        bannerImage: null as string | null,
        profileImage: null as string | null
    });
    const [formData, setFormData] = useState({
        name: '',
        bio: ''
    });
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    useEffect(() => {
        const loadNfts = async () => {
            if (!address) return;
            setIsLoadingNfts(true);
            try {
                const nfts = await getUserProofNFTs(address as `0x${string}`);
                setMyNfts(nfts);
            } catch (e) {
                console.error('Failed to load NFTs', e);
            } finally {
                setIsLoadingNfts(false);
            }
        };
        loadNfts();
    }, [address]);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [statistics, setStatistics] = useState({
        causesSupported: 0,
        totalDonated: 0,
        totalProfit: 0,
        totalDesigns: 0
    });
    const [isDesigner, setIsDesigner] = useState(false);
    const [isNgo, setIsNgo] = useState(false);
    
    const [createdCampaigns, setCreatedCampaigns] = useState<any[]>([]);
    const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersPage, setOrdersPage] = useState(0);
    const [isUploadingCampaign, setIsUploadingCampaign] = useState(false);
    const [isCampaignCreatedSuccessfully, setIsCampaignCreatedSuccessfully] = useState(false);
    const [isCampaignCreateError, setIsCampaignCreateError] = useState(false);
    const [campaignErrorText, setCampaignErrorText] = useState('');
    const inFlightRef = useRef(false)

   
    useEffect(() => {
        const loadProfile = async () => {
            console.log('Loading profile - address:', address, 'isConnected:', isConnected);
            
            if (address && isConnected) {
                try {
                    const firebaseProfile = await getUserProfile(address);
                    console.log('Firebase profile loaded:', firebaseProfile);
                    
                    if (firebaseProfile) {
                        console.log('Setting profile data from Firebase:', {
                            hasBannerImage: !!firebaseProfile.bannerImage,
                            hasProfileImage: !!firebaseProfile.profileImage,
                            bannerImageLength: firebaseProfile.bannerImage?.length || 0,
                            profileImageLength: firebaseProfile.profileImage?.length || 0
                        });
                        setProfileData({
                            name: firebaseProfile.name || 'User',
                            bio: firebaseProfile.bio || '',
                            bannerImage: firebaseProfile.bannerImage || null,
                            profileImage: firebaseProfile.profileImage || null
                        });
                    } else {
                        console.log('No Firebase profile found, checking localStorage...');
                       
                        const savedProfile = localStorage.getItem('userProfile');
                        if (savedProfile) {
                            const profile = JSON.parse(savedProfile);
                            console.log('Loaded from localStorage:', profile);
                            setProfileData({
                                name: profile.name || 'User',
                                bio: profile.bio || '',
                                bannerImage: profile.bannerImage || null,
                                profileImage: profile.profileImage || null
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error loading profile from Firebase:', error);
                    
                    const savedProfile = localStorage.getItem('userProfile');
                    if (savedProfile) {
                        const profile = JSON.parse(savedProfile);
                        setProfileData({
                            name: profile.name || 'User',
                            bio: profile.bio || '',
                            bannerImage: profile.bannerImage || null,
                            profileImage: profile.profileImage || null
                        });
                    }
                }
            } else {
                console.log('Not connected, loading from localStorage...');
                
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            setProfileData({
                name: profile.name || 'User',
                bio: profile.bio || '',
                bannerImage: profile.bannerImage || null,
                profileImage: profile.profileImage || null
            });
        }
            }
        };
        
        loadProfile();
    }, [address, isConnected]);

    useEffect(() => {
        const checkRoles = async () => {
            if (address && isConnected) {
                try {
                    const roles = await getUserRoles(address as `0x${string}`);
                    console.log('🔍 Checking user roles for:', address);
                    console.log('📊 Roles fetched:', roles);
                    console.log('🎨 isDesigner (on-chain verified):', roles.isDesigner);
                    console.log('🏢 isNgo (on-chain verified):', roles.isNgo);
                    setIsDesigner(roles.isDesigner);
                    setIsNgo(roles.isNgo);
                } catch (error) {
                    console.error('❌ Error checking roles:', error);
                }
            }
        };
        checkRoles();
        
        const interval = setInterval(checkRoles, 10000);
        return () => clearInterval(interval);
    }, [address, isConnected]);

    
   
    useEffect(() => {
        const loadDesigns = async () => {
            if (address && isConnected) {
                try {
                   
                    let firebaseDesigns = await getUserDesigns(address);
                    
                    
                    const designsToMigrate = firebaseDesigns.filter((design: any) => 
                        (design.frontDesign?.dataUrl && !design.frontDesign?.url) || 
                        (design.backDesign?.dataUrl && !design.backDesign?.url)
                    );
                    
                   
                    if (designsToMigrate.length > 0) {
                        console.log(`Migrating ${designsToMigrate.length} designs to Firebase Storage...`);
                        await Promise.all(
                            designsToMigrate.map((design: any) => migrateDesignImagesToFirebase(design, address, 'user'))
                        );
                        
                       
                        firebaseDesigns = await getUserDesigns(address);
                    }
                    
                    if (firebaseDesigns && firebaseDesigns.length > 0) {
                       
                        const formattedDesigns = firebaseDesigns.map((design: any) => ({
                            id: parseInt(design.id),
                            ...design
                        }));
                        setCreatedDesigns(formattedDesigns);
                    } else {
                       
                        const savedDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
                        setCreatedDesigns(savedDesigns);
                    }
                } catch (error) {
                    console.error('Error loading designs from Firebase:', error);
                    
                    const savedDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
                    setCreatedDesigns(savedDesigns);
                }
            } else {
                
        const savedDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
        setCreatedDesigns(savedDesigns);
            }
        

        const savedTab = localStorage.getItem('activeProfileTab');
        if (savedTab && (savedTab === 'NFTs' || savedTab === 'History' || savedTab === 'Created')) {
            setActiveCategory(savedTab as 'NFTs' | 'History' || 'Created');
        }
        };
        
        loadDesigns();
    }, [address, isConnected]);

    useEffect(() => {
        const loadCampaigns = async () => {
            if (address && isConnected && isNgo) {
                try {
                    const chainCampaigns = await listAllCampaignsFromChain();
                    const userChain = (chainCampaigns || []).filter((c: any) => c.ngoWallet?.toLowerCase() === address.toLowerCase());
                    setCreatedCampaigns(userChain);
                } catch (e) {
                    setCreatedCampaigns([]);
                }
            }
        };
        loadCampaigns();
    }, [address, isConnected, isNgo]);

    useEffect(() => {
        const loadOrders = async () => {
            if (address && isConnected) {
                try {
                    const userOrders = await getOrdersByWallet(address)
                    setOrders(userOrders)
                } catch (e) {
                    setOrders([])
                }
            }
        }
        loadOrders()
    }, [address, isConnected])

    useEffect(() => {
        const calculateStats = async () => {
            if (address && isConnected) {
                try {
                    
                } catch (error) {
                    console.error('Error loading stats from Firebase:', error);
                    // donationHistory = JSON.parse(localStorage.getItem('userDonations') || '[]');
                    // purchaseHistory = allPurchases.filter((purchase: any) => 
                    //     purchase.creatorWallet?.toLowerCase() === address.toLowerCase()
                    // );
                }
            } else {
                // donationHistory = JSON.parse(localStorage.getItem('userDonations') || '[]');
                // purchaseHistory = allPurchases.filter((purchase: any) => 
                //     purchase.creatorWallet?.toLowerCase() === address.toLowerCase()
                // );
            }
        
        // const uniqueCampaigns = new Set(donationHistory.map((donation: any) => donation.campaign).filter(Boolean));
        
        // const totalDonated = donationHistory.reduce((sum: number, donation: any) => {
        //     const amount = parseFloat(donation.amount?.replace(/[^\d.]/g, '') || '0');
        //     return sum + amount;
        // }, 0);
        
        // const totalProfit = purchaseHistory.reduce((sum: number, purchase: any) => {
        //     const amount = parseFloat(purchase.amount?.replace(/[^\d.]/g, '') || '0');
        //     return sum + amount;
        // }, 0);
        
        setStatistics({
            causesSupported: 0, // No longer calculated from donationHistory
            totalDonated: 0, // No longer calculated from donationHistory
            totalProfit: 0, // No longer calculated from purchaseHistory
                totalDesigns: createdDesigns.length
        });
        setIsLoading(false);
        };
        
        calculateStats();
    }, [createdDesigns, address, isConnected]);

    const handleCategoryChange = (category: 'NFTs' | 'History' | 'Created' | 'Campaigns') => {
        setActiveCategory(category);
    };

    const handleCopyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shortenAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleEditProfile = () => {
        
        setFormData({
            name: profileData.name,
            bio: profileData.bio
        });
        setBannerImage(profileData.bannerImage);
        setProfileImage(profileData.profileImage);
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        if (!isSaving) {
        setIsEditModalOpen(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        
        const updatedProfile = {
            name: formData.name,
            bio: formData.bio,
            bannerImage: bannerImage || profileData.bannerImage,
            profileImage: profileImage || profileData.profileImage
        };
        
        console.log('Saving profile:', { 
            name: updatedProfile.name, 
            bio: updatedProfile.bio,
            hasBannerImage: !!updatedProfile.bannerImage,
            hasProfileImage: !!updatedProfile.profileImage,
            bannerImageLength: updatedProfile.bannerImage?.length || 0,
            profileImageLength: updatedProfile.profileImage?.length || 0
        });
        console.log('Address:', address, 'isConnected:', isConnected);
        
        setProfileData(prev => ({
            ...prev,
            name: formData.name,
            bio: formData.bio,
            bannerImage: bannerImage || prev.bannerImage,
            profileImage: profileImage || prev.profileImage
        }));
        
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
        console.log('Saved to localStorage');

        if (address && isConnected) {
            try {
                console.log('Attempting to save to Firebase with images...');
                const result = await saveUserProfileWithImages(address, updatedProfile);
                console.log('Save result:', result);
            } catch (error) {
                console.error('Error saving profile to Firebase:', error);
            }
        } else {
            console.log('Not saving to Firebase - address or connection missing');
        }
        
        setIsSaving(false);
        setIsEditModalOpen(false);
      
        setShowSuccessMessage(true);
        
        setTimeout(() => {
            setShowSuccessMessage(false);
        }, 3000);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setBannerImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateCampaign = async (campaignData: any) => {
        if (inFlightRef.current) return
        inFlightRef.current = true
        setIsUploadingCampaign(true);
        setIsCampaignCreateError(false);
        setCampaignErrorText('');
        try {
            if (!address) throw new Error('Wallet not connected');
            let imageCid: string | null = null
            if (!campaignData.coverImageFile) {
              throw new Error('Campaign image is required')
            }
            imageCid = await uploadFileToIPFS(campaignData.coverImageFile)
            if (!imageCid) {
              throw new Error('Image upload failed; campaign will not be created')
            }
            const imageUrl = `https://ipfs.io/ipfs/${imageCid}`; // Always use HTTP for src
            // During campaign creation: create the onchain metadata object with 'goal' clearly set
            const goal = parseFloat((campaignData.target || '0').toString().replace(/[^0-9.]/g, '')) || 0
            const baseMeta = { title: campaignData.campaignTitle, category: campaignData.category, description: campaignData.description, image: imageUrl, goal };
            const contentHash = keccak256(stringToHex(JSON.stringify(baseMeta)));
            const meta = { ...baseMeta, contentHash };
            const metadataCid = await uploadMetadataToIPFS(meta);
            if (!metadataCid) throw new Error('Failed to upload metadata to IPFS');
            await storeHashViaRelayer(imageCid, address!);
            await storeHashViaRelayer(metadataCid, address!);
            const { receipt } = await createCampaignByNGO({ designer: address as `0x${string}`, title: campaignData.campaignTitle, description: campaignData.description, imageCid: imageCid, metadataCid, targetHBAR: goal });
            
            const receiptStatus = receipt?.status as string | number | undefined
            if (!receipt || receiptStatus === 'reverted' || receiptStatus === 0 || receiptStatus === '0x0') {
                throw new Error('Campaign creation transaction failed on-chain')
            }
            
            setIsCampaignCreatedSuccessfully(true)
            setIsCreateCampaignModalOpen(false)
            // New logic: refetch campaigns after creation
            do {
              const chainCampaigns = await listAllCampaignsFromChain();
              const userChain = (chainCampaigns || []).filter((c: any) => c.ngoWallet?.toLowerCase() === address.toLowerCase());
              setCreatedCampaigns(userChain);
            } while(false);
        } catch (err: any) {
            setIsCampaignCreateError(true)
            setCampaignErrorText(err?.message || 'Failed to create campaign')
        } finally {
            setIsUploadingCampaign(false)
            inFlightRef.current = false
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <SkeletonProfile />
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Header />
            
         
            <div className="pt-0 max-w-[1440px] mx-auto">
             
                <div className="relative w-full h-[150px] md:h-[250px] bg-black ">
                   
                    {profileData.bannerImage && (
                        <img 
                            src={profileData.bannerImage} 
                            alt="Banner" 
                            className="w-full h-full object-cover"
                        />
                    )}
                    
                    
                    <div className="absolute bottom-[-25%]  left-4 md:left-7">
                        <div className="relative">
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-yellow-400 rounded-full flex items-center justify-center overflow-hidden">
                                {profileData.profileImage ? (
                                    <img 
                                        src={profileData.profileImage} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <span className="text-black text-2xl md:text-4xl font-bold"></span>
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                                <Camera size={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
                
              
                <div className="px-4 md:px-7 pt-12 md:pt-24">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
                      
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-4xl font-bold text-black mb-2">{profileData.name || 'User'}</h1>
                            {profileData.bio && (
                                <p className="text-black text-sm md:text-lg leading-relaxed max-w-md mb-3">
                                {profileData.bio}
                            </p>
                            )}
                            {isConnected && address && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={handleCopyAddress}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-mono"
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={16} className="text-green-600" />
                                                <span className="text-green-600">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} className="text-gray-600" />
                                                <span className="text-gray-700">{shortenAddress(address)}</span>
                                            </>
                                        )}
                                    </button>
                                    {isDesigner && (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                            🎨 Designer
                                        </span>
                                    )}
                                    {isNgo && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                            🏢 NGO
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        
                   
                        <div className="flex flex-row flex-wrap gap-3">
                            <Button variant="secondary" size="lg" className="gap-2" onClick={handleEditProfile}>
                                Edit Profile
                            </Button>
                            
                            {isDesigner ? (
                                <Button 
                                    variant="primary-bw" 
                                    size="lg" 
                                    className="gap-2" 
                                    onClick={() => navigate('/create-design', { state: { fromNgo: false } })}
                                >
                                    <Plus size={20} />
                                    Create Design
                                </Button>
                            ) : (
                                <Button 
                                    variant="secondary" 
                                    size="lg" 
                                    className="gap-2" 
                                    onClick={() => navigate('/become-a-designer', { state: { fromNgo: false } })}
                                >
                                    <Plus size={20} />
                                    Become a Designer
                                </Button>
                            )}
                            
                            {isNgo ? (
                                <Button 
                                    variant="primary-bw" 
                                    size="lg" 
                                    className="gap-2" 
                                    onClick={() => setIsCreateCampaignModalOpen(true)}
                                >
                                    <Plus size={20} />
                                    Create Campaign
                                </Button>
                            ) : (
                                <Button 
                                    variant="secondary" 
                                    size="lg" 
                                    className="gap-2" 
                                    onClick={() => navigate('/become-an-ngo')}
                                >
                                    <Plus size={20} />
                                    Become an NGO
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                
              
                <div className="px-4 md:px-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-black rounded-lg p-6">
                        <h3 className="text-white text-sm font-medium mb-2">Causes Supported</h3>
                        <p className="text-white text-3xl md:text-4xl font-bold">{statistics.causesSupported}</p>
                    </div>
                    
                  
                    <div className="bg-black rounded-lg p-6">
                        <h3 className="text-white text-sm font-medium mb-2">Total Donated</h3>
                        <p className="text-white text-3xl md:text-4xl font-bold">{statistics.totalDonated.toLocaleString()} HBAR</p>
                    </div>
                    
                   
                    {isDesigner && (
                        <div className="bg-black rounded-lg p-6">
                            <h3 className="text-white text-sm font-medium mb-2">Total Profit</h3>
                            <p className="text-white text-3xl md:text-4xl font-bold">{statistics.totalProfit.toLocaleString()} HBAR</p>
                        </div>
                    )}
                    
                 
                    {isDesigner && (
                        <div className="bg-black rounded-lg p-6">
                            <h3 className="text-white text-sm font-medium mb-2">Total Designs</h3>
                            <p className="text-white text-3xl md:text-4xl font-bold">{statistics.totalDesigns}</p>
                        </div>
                    )}

                    {isNgo && (
                        <div className="bg-black rounded-lg p-6">
                            <h3 className="text-white text-sm font-medium mb-2">Total Campaigns</h3>
                            <p className="text-white text-3xl md:text-4xl font-bold">{createdCampaigns.length}</p>
                        </div>
                    )}
                    </div>
                </div>
                
             
                <div className="px-4 md:px-7 mt-20">
                  
                    <div className="flex gap-2 mb-8 flex-wrap">
                        <Button 
                            variant={activeCategory === 'NFTs' ? 'primary-bw' : 'secondary'} 
                            size="lg"
                            onClick={() => handleCategoryChange('NFTs')}
                        >
                            NFTs
                        </Button>
                        <Button 
                            variant={activeCategory === 'History' ? 'primary-bw' : 'secondary'} 
                            size="lg"
                            onClick={() => handleCategoryChange('History')}
                        >
                            History
                        </Button>
                        {isDesigner && (
                            <Button 
                                variant={activeCategory === 'Created' ? 'primary-bw' : 'secondary'} 
                                size="lg"
                                onClick={() => handleCategoryChange('Created')}
                            >
                                Created
                            </Button>
                        )}
                        {isNgo && (
                            <Button 
                                variant={activeCategory === 'Campaigns' ? 'primary-bw' : 'secondary'} 
                                size="lg"
                                onClick={() => handleCategoryChange('Campaigns')}
                            >
                                Campaigns
                            </Button>
                        )}
                    </div>
                    
                   
                    {activeCategory === 'NFTs' && (
                        <div className="mb-40">
                            {isLoadingNfts ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4 animate-pulse">🎫</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading your NFTs…</h3>
                                </div>
                            ) : myNfts.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🎫</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No NFTs collected yet</h3>
                                    <p className="text-gray-500">Your collected NFTs will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {myNfts.map((nft, idx) => (
                                        <div key={idx} className="border rounded-xl overflow-hidden bg-white">
                                            {nft.image ? (
                                                <img src={nft.image} alt={`NFT #${nft.tokenId.toString()}`} className="w-full h-48 object-cover" />
                                            ) : (
                                                <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                                            )}
                                            <div className="p-3">
                                                <div className="text-sm font-medium text-black">NFT #{nft.tokenId.toString()}</div>
                                                {nft.tokenURI && (
                                                    <a className="text-xs text-blue-600 underline" href={(nft.tokenURI.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${nft.tokenURI.replace('ipfs://','')}` : nft.tokenURI)} target="_blank" rel="noreferrer">View Metadata</a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeCategory === 'History' && (
                        <div className="mb-40">
                            {orders.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📜</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No transaction history</h3>
                                    <p className="text-gray-500">Your purchase and donation history will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.slice(ordersPage * 10, ordersPage * 10 + 10).map((o, idx) => (
                                        <div key={idx} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-medium">Order with {o.items?.length || 0} item(s)</div>
                                                    <div className="text-xs text-gray-500 mt-1">{new Date(o.createdAt || Date.now()).toLocaleString()}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">Txs: {o.txHashes?.length || 0}</div>
                                                    {o.txHashes && o.txHashes[0] && (
                                                        <a className="text-xs underline text-blue-600" href={`https://hashscan.io/testnet/transaction/${o.txHashes[0]}`} target="_blank" rel="noreferrer">View on HashScan</a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between mt-4">
                                        <Button variant="secondary" onClick={() => setOrdersPage(Math.max(0, ordersPage - 1))} disabled={ordersPage === 0}>Previous</Button>
                                        <span className="text-sm text-gray-600">Page {ordersPage + 1} of {Math.ceil(orders.length / 10)}</span>
                                        <Button variant="secondary" onClick={() => setOrdersPage(Math.min(Math.ceil(orders.length / 10) - 1, ordersPage + 1))} disabled={ordersPage >= Math.ceil(orders.length / 10) - 1}>Next</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeCategory === 'Created' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-40">
                            {createdDesigns.length > 0 ? (
                                createdDesigns.map((design) => (
                                    <div 
                                        key={design.id} 
                                        className="bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/product/${design.id}`)}
                                    >
                                        <div className="rounded-2xl bg-[#eeeeee] mb-4">
                                            <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center relative">
                                             
                                                <img 
                                                    src="/shirtfront.png" 
                                                    alt="Shirt Mockup" 
                                                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                                    style={{ 
                                                        filter: design.color === '#FFFFFF' ? 'none' : 
                                                               design.color === '#000000' ? 'brightness(0)' : 'none'
                                                    }}
                                                />
                                                
                                               
                                                {(design.frontDesign?.dataUrl || design.frontDesign?.url) && (
                                                    <div 
                                                        className="absolute"
                                                        style={{ 
                                                            width: '65%', 
                                                            height: 'auto',
                                                            maxWidth: '145px',
                                                            maxHeight: '200px',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)'
                                                        }}
                                                    >
                                                        <img 
                                                            src={design.frontDesign?.url || design.frontDesign?.dataUrl} 
                                                            alt="Design" 
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                                
                                                    
                                                {!(design.frontDesign?.dataUrl || design.frontDesign?.url) && (
                                                    <div className="text-center text-gray-500">
                                                        <div className="text-4xl mb-2">👕</div>
                                                        <p className="text-sm">{design.type}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-[22px] font-semibold leading-tight mb-1">
                                                {design.pieceName}
                                            </h3>
                                            <p className="text-[14px] text-black/60 mb-3">Campaign: {design.campaign}</p>
                                            <p className="text-[22px] font-semibold">{design.price} HBAR</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Created: {new Date(design.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="text-6xl mb-4">🎨</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No designs created yet</h3>
                                    <p className="text-gray-500 mb-6">Start creating your first design to see it here!</p>
                                    {isDesigner ? (
                                        <Button
                                            variant="primary-bw"
                                            size="lg"
                                            onClick={() => navigate('/create-design', { state: { fromNgo: false } })}
                                            className="gap-2"
                                        >
                                            <Plus size={20} />
                                            Create Design
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={() => navigate('/become-a-designer', { state: { fromNgo: false } })}
                                            className="gap-2"
                                        >
                                            <Plus size={20} />
                                            Become a Designer
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeCategory === 'Campaigns' && isNgo && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-40">
                            {createdCampaigns.length > 0 ? (
                                createdCampaigns.map((campaign) => (
                                    <div 
                                        key={campaign.onchainId || campaign.id} 
                                        className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                                        onClick={() => navigate(`/campaign/${campaign.onchainId || campaign.id}`)}
                                    >
                                        <div className="relative h-48 bg-gray-200">
                                            {campaign.image && (
                                                <img 
                                                    src={campaign.image} 
                                                    alt={campaign.title} 
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-lg font-semibold text-black mb-2">{campaign.title}</h3>
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.description}</p>
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Raised: {campaign.amountRaised || 0} HBAR</span>
                                                    <span>Target: {campaign.target || 0} HBAR</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-black h-2 rounded-full" 
                                                        style={{ width: `${Math.min((campaign.amountRaised || 0) / (campaign.target || 1) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    Created: {new Date(campaign.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {campaign.status || 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <div className="text-6xl mb-4">📢</div>
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No campaigns created yet</h3>
                                    <p className="text-gray-500 mb-6">Start your first fundraising campaign!</p>
                                    <Button
                                        variant="primary-bw"
                                        size="lg"
                                        onClick={() => setIsCreateCampaignModalOpen(true)}
                                        className="gap-2"
                                    >
                                        <Plus size={20} />
                                        Create Campaign
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            
            {isEditModalOpen && (
                <>
                   
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-50"
                        onClick={handleCloseModal}
                    />
                    
                    
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div 
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <button 
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-600" />
                                </button>
                                <h2 className="text-xl font-semibold text-black">Edit profile</h2>
                                <Button 
                                    variant="primary-bw" 
                                    size="sm"
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save'
                                    )}
                                </Button>
                            </div>
                            
                          
                            <div className="p-6">
                              
                                <div className="relative mb-6">
                                    <div className="w-full h-32 bg-black rounded-xl relative overflow-hidden">
                                        {bannerImage && (
                                            <img 
                                                src={bannerImage} 
                                                alt="Banner" 
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-colors cursor-pointer">
                                            <Camera size={24} className="text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleBannerUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                                
                               
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center relative -mt-10 ml-4 overflow-hidden">
                                        {profileImage ? (
                                            <img 
                                                src={profileImage} 
                                                alt="Profile" 
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        ) : (
                                            <span className="text-black text-2xl font-bold"></span>
                                        )}
                                        <label className="absolute w-8 h-8 bg-black rounded-full flex items-center justify-center cursor-pointer border-2 border-white">
                                            <Camera size={14} className="text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleProfileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                                
                               
                                <div className="space-y-4">
                                   
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                        />
                                    </div>
                                    
                                   
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => handleInputChange('bio', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
            
           
            {showSuccessMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Profile has been successfully updated!</span>
                </div>
            )}

            {isCreateCampaignModalOpen && (
                <CreateCampaignModal 
                    isOpen={isCreateCampaignModalOpen}
                    onClose={async () => {
                        setIsCreateCampaignModalOpen(false);
                        if (address && isConnected && isNgo) {
                            try {
                                const allCampaigns = await listAllCampaignsFromChain();
                                const userCampaigns = allCampaigns.filter((c: any) => 
                                    c.ngoWallet?.toLowerCase() === address.toLowerCase()
                                );
                                setCreatedCampaigns(userCampaigns);
                            } catch (error) {
                                console.error('Error reloading campaigns:', error);
                            }
                        }
                    }}
                    onSubmit={handleCreateCampaign}
                />
            )}
            
            <Footer />

            {isUploadingCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-bold mb-2">Uploading Campaign</h2>
                        <p className="text-gray-600">Please wait while we upload your campaign...</p>
                    </div>
                </div>
            )}

            {isCampaignCreatedSuccessfully && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Campaign Created!</h2>
                        <p className="text-gray-600 mb-6">Your campaign has been created successfully.</p>
                        <Button 
                            variant="primary-bw" 
                            size="lg"
                            onClick={() => {
                                setIsCampaignCreatedSuccessfully(false);
                                setActiveCategory('Campaigns');
                            }}
                            className="w-full"
                        >
                            View Campaigns
                        </Button>
                    </div>
                </div>
            )}

            {isCampaignCreateError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Campaign Creation Failed</h2>
                        <p className="text-gray-600 mb-6">{campaignErrorText}</p>
                        <Button variant="primary-bw" size="lg" onClick={() => setIsCampaignCreateError(false)} className="w-full">Close</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserProfile;

