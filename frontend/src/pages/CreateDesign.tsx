import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'
import Header from '../component/Header'
import Footer from '../component/Footer'
import Button from '../component/Button'
import { ChevronDown, Upload, X, CheckCircle } from 'lucide-react'
import { saveUserDesign, saveNGODesign, saveToGlobalDesigns, uploadDesignImageToFirebase, saveDesignIndex } from '../utils/firebaseStorage'
import { uploadFileToIPFS, uploadMetadataToIPFS } from '../utils/ipfs'
import { keccak256, stringToHex } from 'viem'
import { createDesign, listActiveCampaignsWithMeta } from '../onchain/adapter'

const CreateDesign = () => {
    const { address } = useAccount()
    const [selectedType, setSelectedType] = useState('Shirt')
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [quantity, setQuantity] = useState('1')
    const [selectedColor, setSelectedColor] = useState('white')
    const [customColor, setCustomColor] = useState('#000000')
    const [price, setPrice] = useState('')
    const [frontDesign, setFrontDesign] = useState<File | null>(null)
    const [backDesign, setBackDesign] = useState<File | null>(null)
    const [currentStep, setCurrentStep] = useState(1)
    const [pieceName, setPieceName] = useState('')
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null)
    const [description, setDescription] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [showProcessingModal, setShowProcessingModal] = useState(false)
    const [countdown, setCountdown] = useState(15)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editDesignId, setEditDesignId] = useState<number | null>(null)
    const [existingFrontImage, setExistingFrontImage] = useState<string | null>(null)
    const [existingBackImage, setExistingBackImage] = useState<string | null>(null)
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [campaignSearch, setCampaignSearch] = useState('')
    const [campaignCategoryFilter, setCampaignCategoryFilter] = useState<string>('all')
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const countdownRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const list = await listActiveCampaignsWithMeta();
                setCampaigns(list)
            } catch {}
        }
        load()
    }, [])
   
    useEffect(() => {
        if (location.state?.editDesign) {
            const editDesign = location.state.editDesign
            setIsEditMode(true)
            setEditDesignId(editDesign.id)
            setSelectedType(editDesign.type || 'Shirt')
            setSelectedSizes(editDesign.sizes || [])
            setQuantity(editDesign.quantity?.toString() || '1')
            setSelectedColor(editDesign.color === '#FFFFFF' ? 'white' : editDesign.color === '#000000' ? 'black' : 'custom')
            setCustomColor(editDesign.color)
            setPrice(editDesign.price?.toString() || '20,000')
            setPieceName(editDesign.pieceName || '')
            setSelectedCampaignId(Number(editDesign.campaign) || null)
            setDescription(editDesign.description || '')
            setExistingFrontImage(editDesign.frontDesign?.url || editDesign.frontDesign?.dataUrl || null)
            setExistingBackImage(editDesign.backDesign?.url || editDesign.backDesign?.dataUrl || null)
            setCurrentStep(1) 
        }
    }, [location.state])
   
    useEffect(() => {
        return () => { if (countdownRef.current) { clearInterval(countdownRef.current) } }
    }, [])

    const colors = [ { name: 'white', value: '#FFFFFF' }, { name: 'black', value: '#000000' } ]

    const getCurrentColor = () => {
        if (selectedColor === 'custom') { return customColor }
        const colorObj = colors.find(c => c.name === selectedColor)
        return colorObj ? colorObj.value : '#000000'
    }

    const getColorFilter = (color: string) => {
        if (color === '#FFFFFF') return 'none'
        if (color === '#000000') return 'brightness(0)'
        const colorMap: { [key: string]: string } = {
            '#FF0000': 'hue-rotate(0deg) saturate(3) brightness(0.7)', 
            '#0000FF': 'hue-rotate(240deg) saturate(3) brightness(0.7)', 
            '#00FF00': 'hue-rotate(120deg) saturate(3) brightness(0.7)', 
            '#FFFF00': 'hue-rotate(60deg) saturate(3) brightness(0.8)', 
            '#800080': 'hue-rotate(300deg) saturate(3) brightness(0.6)', 
            '#FFA500': 'hue-rotate(30deg) saturate(3) brightness(0.8)', 
            '#FFC0CB': 'hue-rotate(350deg) saturate(2) brightness(0.9)'
        }
        return colorMap[color] || 'none'
    }

    const handleFileUpload = (file: File, type: 'front' | 'back') => { if (type === 'front') setFrontDesign(file); else setBackDesign(file) }
    const handleRemoveDesign = (type: 'front' | 'back') => { if (type === 'front') { setFrontDesign(null); setExistingFrontImage(null) } else { setBackDesign(null); setExistingBackImage(null) } }
    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => { const file = event.target.files?.[0]; if (file) handleFileUpload(file, type) }
    const handleDragOver = (event: React.DragEvent) => { event.preventDefault() }
    const handleDrop = (event: React.DragEvent, type: 'front' | 'back') => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) handleFileUpload(file, type) }

    const handleStepClick = (step: number) => {
        if (step === 1) setCurrentStep(1)
        if (step === 2 && selectedCampaignId) setCurrentStep(2)
        if (step === 3 && selectedCampaignId && isFormValid()) setCurrentStep(3)
    }

    const handleNext = () => { if (currentStep === 1 && selectedCampaignId) setCurrentStep(2); else if (currentStep === 2) setCurrentStep(3) }

    const handleFinish = () => {
        const isNgo = window.location.pathname.includes('/ngo-profile') || (location.state && location.state.fromNgo)
        const storageKey = isNgo ? 'ngoDesigns' : 'userDesigns'
        
        const convertFileToBlobURL = async (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const dataUrl = e.target?.result as string;
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) { resolve(dataUrl); return }
                        const maxWidth = 800; const maxHeight = 800;
                        let width = img.width; let height = img.height;
                        if (width > maxWidth || height > maxHeight) { if (width > height) { height = (height * maxWidth) / width; width = maxWidth } else { width = (width * maxHeight) / height; height = maxHeight } }
                        canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((blob) => { resolve(blob ? URL.createObjectURL(blob) : dataUrl) }, 'image/png');
                    };
                    img.onerror = () => resolve(dataUrl);
                    img.src = dataUrl;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };
       
        const createDesignData = async () => {
            const designId = isEditMode ? editDesignId! : Date.now().toString();
            let frontDesignUrl = existingFrontImage; let backDesignUrl = existingBackImage;
            if (frontDesign) { try { frontDesignUrl = await convertFileToBlobURL(frontDesign) } catch {} }
            if (backDesign) { try { backDesignUrl = await convertFileToBlobURL(backDesign) } catch {} }
            const designData = {
                id: designId,
                type: selectedType,
                sizes: selectedSizes,
                quantity: parseInt(quantity),
                color: getCurrentColor(),
                price: price,
                pieceName: pieceName,
                campaign: selectedCampaignId,
                description: description,
                createdAt: isEditMode ? undefined : new Date().toISOString(),
                isNgo: isNgo,
                walletAddress: address || '',
                connectedWalletAddress: address || '',
                frontDesign: frontDesignUrl ? { name: frontDesign?.name || 'front', size: frontDesign?.size || 0, type: frontDesign?.type || 'image/png', dataUrl: frontDesignUrl } : null,
                backDesign: backDesignUrl ? { name: backDesign?.name || 'back', size: backDesign?.size || 0, type: backDesign?.type || 'image/png', dataUrl: backDesignUrl } : null
            };
            return designData;
        };
        
        createDesignData().then(async (designData) => {
            try { if (!address) { return } setShowProcessingModal(true)
                const designId = designData.id
                let frontImageUrl = designData.frontDesign?.dataUrl || null
                let backImageUrl = designData.backDesign?.dataUrl || null
                if (designData.frontDesign?.dataUrl) { const uploadedUrl = await uploadDesignImageToFirebase(designId.toString(), 'front', designData.frontDesign.dataUrl); if (uploadedUrl) frontImageUrl = uploadedUrl }
                if (designData.backDesign?.dataUrl) { const uploadedUrl = await uploadDesignImageToFirebase(designId.toString(), 'back', designData.backDesign.dataUrl); if (uploadedUrl) backImageUrl = uploadedUrl }
                let designFileCid: string | null = null
                let previewCid: string | null = null
                if (!frontDesign) { throw new Error('Please upload a front design image') }
                
                const hashFile = async (file: File): Promise<string> => {
                    const arrayBuffer = await file.arrayBuffer()
                    const uint8Array = new Uint8Array(arrayBuffer)
                    const hexString = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('')
                    return keccak256(`0x${hexString}` as `0x${string}`)
                }
                
                const frontDesignHash = await hashFile(frontDesign)
                let backDesignHash: string | null = null
                if (backDesign) {
                    backDesignHash = await hashFile(backDesign)
                }
                
                designFileCid = await uploadFileToIPFS(frontDesign)
                if (!designFileCid) { throw new Error('Failed to upload design image to IPFS') }
                previewCid = designFileCid
                
                const campaignIdValue = typeof designData.campaign === 'bigint' ? Number(designData.campaign) : (typeof designData.campaign === 'number' ? designData.campaign : Number(designData.campaign) || 0)
                const attributes = [
                    { trait_type: 'campaignId', value: campaignIdValue },
                    { trait_type: 'type', value: designData.type },
                    { trait_type: 'color', value: designData.color },
                    { trait_type: 'sizes', value: designData.sizes },
                    { trait_type: 'frontDesignHash', value: frontDesignHash },
                    ...(backDesignHash ? [{ trait_type: 'backDesignHash', value: backDesignHash }] : [])
                ]
                const baseMeta = { name: designData.pieceName, description: designData.description, image: previewCid ? `ipfs://${previewCid}` : null, attributes }
                const contentHash = keccak256(stringToHex(JSON.stringify(baseMeta)))
                const metadata = { ...baseMeta, contentHash, frontDesignHash, ...(backDesignHash ? { backDesignHash } : {}) }
                const metadataCid = await uploadMetadataToIPFS(metadata)
                if (!metadataCid) { throw new Error('Failed to upload metadata to IPFS') }
                if (selectedCampaignId == null) { throw new Error('Select a campaign before creating the design') }
                const { storeHashViaRelayer } = await import('../utils/relayer')
                await storeHashViaRelayer(designFileCid, address!)
                if (previewCid) await storeHashViaRelayer(previewCid, address!)
                await storeHashViaRelayer(metadataCid, address!)
                const cleanPrice = parseFloat((designData.price || '0').toString().replace(/[^0-9.]/g, '')) || 0
                await createDesign({ campaignId: BigInt(selectedCampaignId), designName: designData.pieceName, description: designData.description, designFileCid, previewImageCid: previewCid || designFileCid, metadataCid, priceHBAR: cleanPrice })
                await saveDesignIndex(designId.toString(), { metadataCid, previewCid: previewCid || undefined, designCid: designFileCid || undefined })
            const existingDesigns = JSON.parse(localStorage.getItem(storageKey) || '[]')
                const designDataForFirebase = { ...designData, frontDesign: frontImageUrl ? { name: designData.frontDesign?.name || 'front', url: frontImageUrl, dataUrl: designData.frontDesign?.dataUrl } : null, backDesign: backImageUrl ? { name: designData.backDesign?.name || 'back', url: backImageUrl, dataUrl: designData.backDesign?.dataUrl } : null }
                if (isEditMode && editDesignId) { const designIndex = existingDesigns.findIndex((design: any) => design.id.toString() === editDesignId.toString()); if (designIndex !== -1) { designDataForFirebase.createdAt = existingDesigns[designIndex].createdAt; existingDesigns[designIndex] = designDataForFirebase } } else { existingDesigns.push(designDataForFirebase) }
            localStorage.setItem(storageKey, JSON.stringify(existingDesigns))
                if (isNgo) { await saveNGODesign(address!, designId.toString(), designDataForFirebase) } else { await saveUserDesign(address!, designId.toString(), designDataForFirebase) }
                await saveToGlobalDesigns(designId.toString(), designDataForFirebase)
            localStorage.setItem('activeProfileTab', 'Created')
                setShowProcessingModal(false); setShowSuccessModal(true); setCountdown(15)
            const redirectPath = isNgo ? '/ngo-profile' : '/user-profile'
                countdownRef.current = setInterval(() => { setCountdown((prev) => { if (prev <= 1) { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null } navigate(redirectPath); return 0 } return prev - 1 }) }, 1000)
            } catch (e) { setShowProcessingModal(false); console.error(e) }
        }).catch(() => { setShowProcessingModal(false) })
    }
    
    const handleContinueToProfile = () => {
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
        const isNgo = window.location.pathname.includes('/ngo-profile') || (location.state && location.state.fromNgo)
        const redirectPath = isNgo ? '/ngo-profile' : '/user-profile'
        navigate(redirectPath)
    }

    const handleCancel = () => {
        const isNgo = window.location.pathname.includes('/ngo-profile') || (location.state && location.state.fromNgo)
        const redirectPath = isNgo ? '/ngo-profile' : '/user-profile'
        navigate(redirectPath)
    }

    const handleSizeToggle = (size: string) => { setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]) }
    const handleSelectAllSizes = () => { setSelectedSizes(['XS', 'S', 'M', 'L', 'XL', 'XXL']) }
    const handleClearAllSizes = () => { setSelectedSizes([]) }

    const isFormValid = () => { return selectedSizes.length > 0 && quantity.trim() !== '' && price.trim() !== '' && pieceName.trim() !== '' && description.trim() !== '' }
    const isStep2Valid = () => { return selectedSizes.length > 0 && quantity.trim() !== '' && price.trim() !== '' }

    return (
        <div>
            <Header />
            <section className="px-4 md:px-7 py-12">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-8 relative">
                        {isEditMode && (
                            <button onClick={handleCancel} className="absolute left-0 top-0 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-600" /></button>
                        )}
                        <h1 className="text-4xl font-bold text-black mb-2">{isEditMode ? 'Edit Design' : 'Create Design'}</h1>
                        <p className="text-gray-600">{isEditMode ? 'Update your design details' : 'Design your custom item and launch'}</p>
                    </div>
                    <div className="flex justify-center gap-8 mb-12">
                        <button onClick={() => handleStepClick(1)} className="flex items-center gap-2 hover:opacity-80 transition-opacity"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 1 ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>1</div><span className={`text-lg font-semibold ${currentStep === 1 ? 'text-black' : 'text-gray-500'}`}>Select Campaign</span></button>
                        <button onClick={() => handleStepClick(2)} className={`flex items-center gap-2 transition-opacity ${selectedCampaignId ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`} disabled={!selectedCampaignId}><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 2 ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>2</div><span className={`text-lg font-semibold ${currentStep === 2 ? 'text-black' : 'text-gray-500'}`}>Upload Artwork</span></button>
                        <button onClick={() => handleStepClick(3)} className={`flex items-center gap-2 transition-opacity ${selectedCampaignId ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`} disabled={!selectedCampaignId}><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 3 ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'}`}>3</div><span className={`text-lg font-semibold ${currentStep === 3 ? 'text-black' : 'text-gray-500'}`}>Edit and Launch</span></button>
                    </div>
                    
                    {currentStep === 1 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                                <input value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)} placeholder="Search campaigns" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" />
                                <div className="relative w-full md:w-56">
                                    <button onClick={() => setIsCategoryOpen(!isCategoryOpen)} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-black">
                                        <span className={campaignCategoryFilter ? 'text-black' : 'text-gray-400'}>
                                            {campaignCategoryFilter === 'all' ? 'All categories' : campaignCategoryFilter}
                                        </span>
                                        <ChevronDown size={20} className="text-gray-400" />
                        </button>
                                    {isCategoryOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsCategoryOpen(false)} />
                                            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow mt-1 max-h-56 overflow-auto">
                                                <button className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${campaignCategoryFilter === 'all' ? 'bg-gray-100' : ''}`} onClick={() => { setCampaignCategoryFilter('all'); setIsCategoryOpen(false) }}>All categories</button>
                                                {Array.from(new Set(campaigns.map(c => (c.category || '').toString()).filter(Boolean))).map((cat) => (
                                                    <button key={cat} className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${campaignCategoryFilter === cat ? 'bg-gray-100' : ''}`} onClick={() => { setCampaignCategoryFilter(cat); setIsCategoryOpen(false) }}>{cat}</button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <Button variant="primary-bw" onClick={handleNext} disabled={!selectedCampaignId}>Next</Button>
                            </div>
                            <div className="max-h-80 overflow-auto divide-y rounded-lg border">
                                {campaigns.filter(c => (campaignCategoryFilter === 'all' || (c.category || '').toLowerCase() === campaignCategoryFilter.toLowerCase())).filter(c => c.title.toLowerCase().includes(campaignSearch.toLowerCase()) || c.description.toLowerCase().includes(campaignSearch.toLowerCase())).map(c => {
                                    const campaignId = c.onchainId || c.id
                                    return (
                                    <button key={campaignId} className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedCampaignId === campaignId ? 'bg-gray-100' : ''}`} onClick={() => setSelectedCampaignId(campaignId)}>
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                                { (c.image || c.coverImageFile) && (
                                                    <img src={c.image || c.coverImageFile} alt={c.title || 'Campaign'} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-black">#{campaignId} · {c.title || 'Untitled'}</div>
                                                <div className="text-xs text-gray-600 line-clamp-2">{c.description}</div>
                                                {c.category && (<div className="mt-1 text-[10px] inline-block px-2 py-0.5 bg-gray-100 rounded-full text-gray-700">{c.category}</div>)}
                                            </div>
                                        </div>
                        </button>
                                )})}
                                {campaigns.length === 0 && (<div className="p-6 text-center text-gray-500">No campaigns found</div>)}
                            </div>
                    </div>
                    )}

                    {currentStep === 2 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex flex-col items-center">
                                    <div className="relative w-80 h-96 bg-white-100 rounded-lg flex items-center justify-center ">
                                        <img src="/shirtfront.png" alt="Shirt Front" className="absolute inset-0 w-full h-full object-cover rounded-lg" style={{ filter: getColorFilter(getCurrentColor()) }} />
                                        <div className="absolute border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors" style={{ width: '65%', height: 'auto', maxWidth: '145px', maxHeight: '200px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'front')} onClick={() => document.getElementById('front-upload')?.click()}>
                                            {(frontDesign || existingFrontImage) ? (
                                                <div className="w-full h-full flex items-center justify-center relative">
                                                    <img src={frontDesign ? URL.createObjectURL(frontDesign) : existingFrontImage || ''} alt="Uploaded Design" className="max-w-full max-h-full object-contain" />
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveDesign('front') }} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={32} className="text-gray-400 mb-1" />
                                                    <p className="text-xs font-medium text-gray-600 text-center">Upload Your Design</p>
                                                    <p className="text-xs text-gray-500 text-center mt-1">Drag and drop it here</p>
                                                    <p className="text-xs text-gray-400 text-center mt-1">RECOMMENDED PNG Format, 300 DPI</p>
                                                </>
                                            )}
                                            <input id="front-upload" type="file" accept="image/*" onChange={(e) => handleFileInputChange(e, 'front')} className="hidden" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-black">FRONT</h3>
                                    {frontDesign && (<button onClick={() => document.getElementById('front-upload')?.click()} className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">Replace Image</button>)}
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="relative w-80 h-96 bg-white-100 rounded-lg flex items-center justify-center">
                                        <img src="/shirtfront.png" alt="Shirt Front" className="absolute inset-0 w-full h-full object-cover rounded-lg" style={{ filter: getColorFilter(getCurrentColor()) }} />
                                        <div className="absolute border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors" style={{ width: '65%', height: 'auto', maxWidth: '145px', maxHeight: '200px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'back')} onClick={() => document.getElementById('back-upload')?.click()}>
                                            {backDesign ? (
                                                <div className="w-full h-full flex items-center justify-center relative">
                                                    <img src={URL.createObjectURL(backDesign)} alt="Uploaded Design" className="max-w-full max-h-full object-contain" />
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveDesign('back') }} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={32} className="text-gray-400 mb-1" />
                                                    <p className="text-xs font-medium text-gray-600 text-center">Upload Your Design</p>
                                                    <p className="text-xs text-gray-500 text-center mt-1">Drag and drop it here</p>
                                                    <p className="text-xs text-gray-400 text-center mt-1">RECOMMENDED PNG Format, 300 DPI</p>
                                                </>
                                            )}
                                            <input id="back-upload" type="file" accept="image/*" onChange={(e) => handleFileInputChange(e, 'back')} className="hidden" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-black">BACK</h3>
                                    {backDesign && (<button onClick={() => document.getElementById('back-upload')?.click()} className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">Replace Image</button>)}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <div className="mb-6"><label className="block text-sm font-medium text-black mb-2">Type</label><div className="relative"><select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"><option value="Shirt">Shirt</option><option value="Hoodie">Hoodie</option><option value="Cap">Cap</option><option value="Sweater">Sweater</option><option value="Shoes">Shoes</option></select><ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={20} /></div></div>
                                <div className="mb-6"><label className="block text-sm font-medium text-black mb-2">Size</label><div className="space-y-3"><div className="flex gap-2"><button type="button" onClick={handleSelectAllSizes} className="px-3 py-1 text-sm bg-gray-100 text-black rounded hover:bg-gray-200 transition-colors">Select All</button><button type="button" onClick={handleClearAllSizes} className="px-3 py-1 text-sm bg-gray-100 text-black rounded hover:bg-gray-200 transition-colors">Clear All</button></div><div className="grid grid-cols-3 gap-2">{['XS','S','M','L','XL','XXL'].map((size) => (<label key={size} className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => handleSizeToggle(size)} className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2" /><span className="text-sm text-black">{size}</span></label>))}</div>{selectedSizes.length > 0 && (<div className="text-sm text-gray-600">Selected: {selectedSizes.join(', ')}</div>)}</div></div>
                                <div className="mb-6"><label className="block text-sm font-medium text-black mb-2">Quantity</label><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" placeholder="Enter quantity" /></div>
                                <div className="mb-6"><label className="block text-sm font-medium text-black mb-3">Select Colour</label><div className="flex gap-3 mb-3">{colors.map((color) => (<button key={color.name} onClick={() => setSelectedColor(color.name)} className={`w-10 h-10 rounded-full border-2 ${selectedColor === color.name ? 'border-black' : 'border-gray-300'}`} style={{ backgroundColor: color.value }} />))}</div><div className="flex items-center gap-2"><input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); setSelectedColor('custom') }} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" /><span className="text-sm text-gray-600">Custom Color</span></div></div>
                                <div className="mb-8"><label className="block text-sm font-medium text-black mb-2">Price (HBAR)</label><div className="relative"><input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" placeholder="Enter amount" /></div></div>
                                <div className="flex gap-3"><Button variant="secondary" size="lg" onClick={() => setCurrentStep(1)} className="flex-1 rounded-lg py-4 text-lg">Back</Button><Button variant="primary-bw" size="lg" onClick={() => setCurrentStep(3)} className="flex-1 rounded-lg py-4 text-lg" disabled={!isStep2Valid()}>Next</Button></div>
                                </div>
                            </div>
                    ) : currentStep === 3 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-80 h-96 bg-white-100 rounded-lg flex items-center justify-center">
                                            <img src="/shirtfront.png" alt="Shirt Front" className="absolute inset-0 w-full h-full object-cover rounded-lg" style={{ filter: getColorFilter(getCurrentColor()) }} />
                                            <div className="absolute border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2" style={{ width: '145px', height: '200px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                {frontDesign ? (<img src={URL.createObjectURL(frontDesign)} alt="Uploaded Design" className="max-w-full max-h-full object-contain" />) : existingFrontImage ? (<img src={existingFrontImage} alt="Uploaded Design" className="max-w-full max-h-full object-contain" />) : null}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-black">FRONT</h3>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-80 h-96 bg-white-100 rounded-lg flex items-center justify-center">
                                            <img src="/shirtfront.png" alt="Shirt Front" className="absolute inset-0 w-full h-full object-cover rounded-lg" style={{ filter: getColorFilter(getCurrentColor()) }} />
                                            <div className="absolute border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2" style={{ width: '145px', height: '200px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                                {backDesign ? (<img src={URL.createObjectURL(backDesign)} alt="Uploaded Design" className="max-w-full max-h-full object-contain" />) : existingBackImage ? (<img src={existingBackImage} alt="Uploaded Design" className="max-w-full max-h-full object-contain" />) : null}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-black">BACK</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <div className="mb-6"><input type="text" value={pieceName} onChange={(e) => setPieceName(e.target.value)} placeholder="Name of Piece" className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent" /></div>
                                <div className="mb-6"><div className="relative"><div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-black">Campaign: {selectedCampaignId != null ? (campaigns.find((c:any) => (c.onchainId || c.id) === selectedCampaignId)?.title || `#${selectedCampaignId}`) : '—'}</div></div></div>
                                <div className="mb-8"><label className="block text-sm font-medium text-black mb-2">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none" /></div>
                                <div className="flex gap-3"><Button variant="secondary" size="lg" onClick={() => setCurrentStep(2)} className="flex-1 rounded-lg py-4 text-lg">Back</Button><Button variant="primary-bw" size="lg" onClick={handleFinish} className="flex-1 rounded-lg py-4 text-lg" disabled={!isStep2Valid() || selectedCampaignId == null}>{isEditMode ? 'Update Design' : 'Finish'}</Button></div>
                                    </div>
                                </div>
                    ) : null}
                </div>
            </section>
            <Footer />
            {showProcessingModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center"><div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><h2 className="text-2xl font-bold text-black mb-2">Creating Your Design...</h2><p className="text-gray-600 mb-6">Please wait while we upload your design and save it to the blockchain.</p></div></div>)}
            {showSuccessModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-black mb-2">{isEditMode ? 'Design Updated Successfully!' : 'Design Created Successfully!'}</h2><p className="text-gray-600 mb-6">{isEditMode ? 'Your design has been updated and is ready for launch.' : 'Your design has been created and is ready for launch.'}</p><Button variant="primary-bw" size="lg" onClick={handleContinueToProfile} className="w-full rounded-lg py-3 text-lg">Continue to Profile</Button><p className="text-sm text-gray-500 mt-4">Redirecting automatically in {countdown} seconds...</p></div></div>)}
        </div>
    )
}

export default CreateDesign









