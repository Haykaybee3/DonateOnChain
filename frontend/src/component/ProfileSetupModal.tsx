import { X, Camera } from 'lucide-react'
import { useState, useEffect } from 'react'
import Button from './Button'
import { useAccount } from 'wagmi'
import { saveUserProfileWithImages } from '../utils/firebaseStorage'

interface ProfileSetupModalProps {
    isOpen: boolean
    onClose: () => void
    existingProfile?: {
        name?: string
        bio?: string
        profileImage?: string | null
        bannerImage?: string | null
    }
}

const ProfileSetupModal = ({ isOpen, onClose, existingProfile }: ProfileSetupModalProps) => {
    const [formData, setFormData] = useState({ name: '', bio: '' })
    const [profileImage, setProfileImage] = useState<string | null>(null)
    const [bannerImage, setBannerImage] = useState<string | null>(null)
    const { address, isConnected } = useAccount()

    useEffect(() => {
        if (existingProfile) {
            setFormData({
                name: existingProfile.name || '',
                bio: existingProfile.bio || ''
            })
            setProfileImage(existingProfile.profileImage || null)
            setBannerImage(existingProfile.bannerImage || null)
        }
    }, [existingProfile, isOpen])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        resolve(dataUrl)
                        return
                    }
                    
                    const maxWidth = 600
                    const maxHeight = 600
                    let width = img.width
                    let height = img.height
                    
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = (height * maxWidth) / width
                            width = maxWidth
                        } else {
                            width = (width * maxHeight) / height
                            height = maxHeight
                        }
                    }
                    
                    canvas.width = width
                    canvas.height = height
                    ctx.drawImage(img, 0, 0, width, height)
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob)
                            resolve(url)
                        } else {
                            resolve(dataUrl)
                        }
                    }, 'image/jpeg', 0.7)
                }
                img.onerror = () => resolve(dataUrl)
                img.src = dataUrl
            }
            reader.onerror = () => resolve('')
            reader.readAsDataURL(file)
        })
    }

    const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const compressedUrl = await compressImage(file)
            setProfileImage(compressedUrl)
        }
    }

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const compressedUrl = await compressImage(file)
            setBannerImage(compressedUrl)
        }
    }

    const handleSave = async () => {
        const profileData = {
            name: formData.name || 'User',
            bio: formData.bio || '',
            bannerImage,
            profileImage
        }
        
        localStorage.setItem('userProfile', JSON.stringify(profileData))
        localStorage.setItem('profileSetupCompleted', 'true')
        
        if (address) {
            sessionStorage.setItem(`profileSetupShown_${address}`, 'true')
        }
        
        if (isConnected && address) {
            try {
                await saveUserProfileWithImages(address, profileData)
                console.log('Profile saved to Firebase')
            } catch (error) {
                console.error('Error saving profile to Firebase:', error)
            }
        }
        
        onClose()
    }

    const handleSkip = () => {
        localStorage.setItem('profileSetupCompleted', 'true')
        if (address) {
            sessionStorage.setItem(`profileSetupShown_${address}`, 'true')
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div 
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <button 
                            onClick={handleSkip}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>
                        <h2 className="text-xl font-semibold text-black">Complete Your Profile</h2>
                        <div className="w-20"></div>
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
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your name"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Bio
                                </label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    placeholder="Tell us about yourself"
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 flex gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={handleSkip} 
                            className="flex-1"
                        >
                            Skip for Now
                        </Button>
                        <Button 
                            variant="primary-bw"
                            onClick={handleSave}
                            className="flex-1"
                        >
                            Continue
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ProfileSetupModal


