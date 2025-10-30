import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Upload as UploadIcon } from 'lucide-react';
import Button from './Button';

interface EditCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (campaignData: any) => void;
    campaign: any;
}

const EditCampaignModal = ({ isOpen, onClose, onSubmit, campaign }: EditCampaignModalProps) => {
    const [formData, setFormData] = useState({
        coverImage: null as File | null,
        campaignTitle: '',
        category: '',
        description: '',
        target: '30000'
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categories = [
        'Healthcare',
        'Education',
        'Climate Change',
        'Poverty Alleviation',
        'Animal Welfare',
        'Disaster Relief'
    ];

    // Populate form with existing campaign data
    useEffect(() => {
        if (campaign) {
            setFormData({
                coverImage: null,
                campaignTitle: campaign.title || '',
                category: campaign.category || '',
                description: campaign.description || campaign.about || '',
                target: campaign.goal?.toString() || campaign.target?.toString() || '30000'
            });
            
            // Set preview image if exists
            if (campaign.image) {
                setPreviewImage(campaign.image);
            }
        }
    }, [campaign, isOpen]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, coverImage: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setFormData({ ...formData, coverImage: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleSubmit = () => {
        onSubmit({
            ...formData,
            coverImageFile: formData.coverImage
        });
        handleClose();
    };

    const handleClose = () => {
        setFormData({
            coverImage: null,
            campaignTitle: '',
            category: '',
            description: '',
            target: '30000'
        });
        setPreviewImage(null);
        setIsCategoryOpen(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Edit Campaign</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        {previewImage ? (
                            <img 
                                src={previewImage} 
                                alt="Preview" 
                                className="w-full h-48 object-cover rounded-lg mb-2"
                            />
                        ) : (
                            <>
                                <UploadIcon className="mx-auto mb-2 text-gray-400" size={32} />
                                <p className="font-bold text-gray-700 mb-1">Upload Your Cover Image</p>
                                <p className="text-sm text-gray-500">Drag and drop it here</p>
                            </>
                        )}
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold mb-3">Campaign Title</h3>
                        <input
                            type="text"
                            placeholder="Name of Campaign"
                            value={formData.campaignTitle}
                            onChange={(e) => setFormData({ ...formData, campaignTitle: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div className="relative">
                        <h3 className="text-2xl font-bold mb-3">Category</h3>
                        <button
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            <span className={formData.category ? 'text-black' : 'text-gray-400'}>
                                {formData.category || 'Category'}
                            </span>
                            <ChevronDown size={20} className="text-gray-400" />
                        </button>
                        {isCategoryOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setIsCategoryOpen(false)}
                                />
                                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                                formData.category === cat ? 'bg-gray-100 font-medium' : ''
                                            }`}
                                            onClick={() => {
                                                setFormData({ ...formData, category: cat });
                                                setIsCategoryOpen(false);
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold mb-3">Description</h3>
                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={5}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        />
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold mb-3">Target</h3>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">N</span>
                            <input
                                type="text"
                                placeholder="30000"
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 text-base focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button 
                            variant="secondary" 
                            size="lg" 
                            onClick={handleClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="primary-bw" 
                            size="lg" 
                            onClick={handleSubmit}
                            className="flex-1"
                        >
                            Update Campaign
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditCampaignModal;

