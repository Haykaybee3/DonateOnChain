import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../component/Header'
import Footer from '../component/Footer'
import Banner from '../component/Banner'
import ProductCard from '../component/ProductCard'
import FilterButton from '../component/FilterButton'
import { SkeletonCard } from '../component/Skeleton'
import ShopImg from '../assets/ShopImg.png'
import { Filter, ChevronDown } from 'lucide-react'
import { products } from '../data/databank'
import { getAllGlobalDesigns } from '../utils/firebaseStorage'
import { listDesigns } from '../onchain/adapter'

const Shop = () => {
    const navigate = useNavigate()
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [filterEntered, setFilterEntered] = useState(false)
    const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false)
    const [activeCategory, setActiveCategory] = useState('all')
    const [filters, setFilters] = useState<{
        priceRange: string[]
        size: string[]
        category: string[]
        [key: string]: string[]
    }>({
        priceRange: [],
        size: [],
        category: []
    })
    const [filteredProducts, setFilteredProducts] = useState<any[]>([])
    const [allItems, setAllItems] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    

    const getCategoryDisplayName = (category: string) => {
        switch (category) {
            case 'all': return 'All'
            case 'fundraisers': return 'Fundraisers'
            case 'bestsellers': return 'Bestsellers'
            case 'creators-choice': return "Creator's Choice"
            default: return 'All'
        }
    }

    const categories = [
        { value: 'all', label: 'All' },
        { value: 'fundraisers', label: 'Fundraisers' },
        { value: 'bestsellers', label: 'Bestsellers' },
        { value: 'creators-choice', label: "Creator's Choice" }
    ]

  
     const getPriceRange = (priceString: string) => {
        const price = parseInt(priceString.replace(/[₦,]/g, ''))
        if (price < 10000) return 'under-10000'
        if (price >= 10000 && price <= 25000) return '10000-25000'
        if (price > 25000 && price <= 50000) return '25000-50000'
        if (price > 50000) return 'above-50000'
        return 'unknown'
    }
  
    useEffect(() => {
        const loadDesigns = async () => {
            try {
                const firebaseDesigns = await getAllGlobalDesigns();
                let chainDesigns: any[] = []
                try {
                    const onchain = await listDesigns()
                    chainDesigns = onchain.map(d => ({
                        id: Number(d.id),
                        pieceName: d.title,
                        frontDesign: {},
                        price: `${Number(d.priceHBAR) / 1e18} HBAR`,
                        type: 'shirt',
                        createdAt: Date.now(),
                    }))
                } catch {}
                
              
                const validFirebaseDesigns = firebaseDesigns.filter((design: any) => design && design.id && design.pieceName);
                
                
               
                const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
                const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]');
                
                const validUserDesigns = userDesigns.filter((design: any) => design && design.id && design.pieceName);
                const validNgoDesigns = ngoDesigns.filter((design: any) => design && design.id && design.pieceName);
                
               
                const allDesigns = [...chainDesigns, ...validFirebaseDesigns, ...validUserDesigns, ...validNgoDesigns];
                const uniqueDesigns = Array.from(
                    new Map(allDesigns.map(design => [design.id, design])).values()
                );
                
                
                
               
                const designItems = uniqueDesigns.map((design: any) => ({
                    id: design.id,
                    image: design.frontDesign?.url || design.frontDesign?.dataUrl || '/src/assets/Clothimg.png',
                    title: design.pieceName || 'Untitled Design',
                    creator: design.isNgo ? 'NGO Design' : 'User Design',
                    price: design.price || '0',
                    category: design.type?.toLowerCase() || 'shirt',
                    categoryType: 'design',
                    isDesign: true,
                    design: design
                }));
                
               
                const sortedDesigns = designItems.sort((a: any, b: any) => {
                    const aTime = new Date(a.design?.createdAt || 0).getTime()
                    const bTime = new Date(b.design?.createdAt || 0).getTime()
                    return bTime - aTime
                });
                const combinedItems = [...sortedDesigns, ...products];
                setAllItems(combinedItems);
                setFilteredProducts(combinedItems);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading designs from Firebase, using localStorage only:', error);
                
               
                const userDesigns = JSON.parse(localStorage.getItem('userDesigns') || '[]');
                const ngoDesigns = JSON.parse(localStorage.getItem('ngoDesigns') || '[]');
                
                const validUserDesigns = userDesigns.filter((design: any) => design && design.id && design.pieceName);
                const validNgoDesigns = ngoDesigns.filter((design: any) => design && design.id && design.pieceName);
                const allDesigns = [...validUserDesigns, ...validNgoDesigns];
                
                const designItems = allDesigns.map((design: any) => ({
                    id: design.id,
                    image: design.frontDesign?.url || design.frontDesign?.dataUrl || '/src/assets/Clothimg.png',
                    title: design.pieceName || 'Untitled Design',
                    creator: 'User Design',
                    price: design.price || '0',
                    category: design.type?.toLowerCase() || 'shirt',
                    categoryType: 'design',
                    isDesign: true,
                    design: design
                }));
                
                const sortedDesigns = designItems.sort((a: any, b: any) => {
                    const aTime = new Date(a.design?.createdAt || 0).getTime()
                    const bTime = new Date(b.design?.createdAt || 0).getTime()
                    return bTime - aTime
                });
                const combinedItems = [...sortedDesigns, ...products];
                setAllItems(combinedItems);
                setFilteredProducts(combinedItems);
                setIsLoading(false);
            }
        };
        
        loadDesigns();
    }, [])

   
    const applyFilters = () => {
        let filtered = allItems

      
        if (activeCategory !== 'all') {
            filtered = filtered.filter(item => 
                item.categoryType === activeCategory
            )
        }

       
        if (filters.priceRange.length > 0) {
            filtered = filtered.filter(item => 
                filters.priceRange.includes(getPriceRange(item.price))
            )
        }

        if (filters.size.length > 0) {
            filtered = filtered.filter(item => 
                item.size && filters.size.includes(item.size)
            )
        }

      
        if (filters.category.length > 0) {
            filtered = filtered.filter(item => 
                filters.category.includes(item.category)
            )
        }

        setFilteredProducts(filtered)
        setIsFilterOpen(false)
    }

 
    const clearFilters = () => {
        setActiveCategory('all')
        setFilters({
            priceRange: [],
            size: [],
            category: []
        })
        setFilteredProducts(allItems)
        setIsFilterOpen(false)
    }

 
    const handleCategoryClick = (category: string) => {
        setActiveCategory(category)
        let filtered = allItems

      
        if (category !== 'all') {
            filtered = filtered.filter(item => 
                item.categoryType === category
            )
        }

      
        if (filters.priceRange.length > 0) {
            filtered = filtered.filter(item => 
                filters.priceRange.includes(getPriceRange(item.price))
            )
        }

        if (filters.size.length > 0) {
            filtered = filtered.filter(item => 
                item.size && filters.size.includes(item.size)
            )
        }

        if (filters.category.length > 0) {
            filtered = filtered.filter(item => 
                filters.category.includes(item.category)
            )
        }

        setFilteredProducts(filtered)
    }

  
    const handleFilterChange = (filterType: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: prev[filterType].includes(value)
                ? prev[filterType].filter((item: string) => item !== value)
                : [...prev[filterType], value]
        }))
    }

    useEffect(() => {
        if (isFilterOpen) {
            const id = requestAnimationFrame(() => setFilterEntered(true))
            return () => cancelAnimationFrame(id)
        } else {
            setFilterEntered(false)
        }
    }, [isFilterOpen])
    return (
        <div>
            <Header />
            <section className="relative h-[400px] md:h-[400px] flex items-center justify-center overflow-hidden mx-4 md:mx-7 my-8 rounded-3xl ">
                <div className="absolute inset-0 z-0">
                    <img
                        src={ShopImg}
                        alt="Shop Hero"
                        className="w-full h-full object-cover rounded-3xl object-center"
                    />
                </div>
                <div className="relative z-10 text-center">
                    <h1 
                        className="text-white font-bold text-6xl md:text-8xl lg:text-9xl tracking-wider"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: 900,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                        }}
                    >
                        SHOP
                    </h1>
                </div>
            </section>

          
            <section className="px-4 md:px-7 py-8">
               
                <div className="flex items-center gap-4 mb-8">
                   
                    <div className="hidden md:flex items-center gap-4">
                        <FilterButton 
                            isActive={activeCategory === 'all'}
                            onClick={() => handleCategoryClick('all')}
                        >
                            All
                        </FilterButton>
                        <FilterButton 
                            isActive={activeCategory === 'fundraisers'}
                            onClick={() => handleCategoryClick('fundraisers')}
                        >
                            Fundraisers
                        </FilterButton>
                        <FilterButton 
                            isActive={activeCategory === 'bestsellers'}
                            onClick={() => handleCategoryClick('bestsellers')}
                        >
                            Bestsellers
                        </FilterButton>
                        <FilterButton 
                            isActive={activeCategory === 'creators-choice'}
                            onClick={() => handleCategoryClick('creators-choice')}
                        >
                            Creator's Choice
                        </FilterButton>
                    </div>

                 
                    <div className="md:hidden relative w-full max-w-[200px]">
                        <button 
                            className="flex items-center justify-between w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                            onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
                        >
                            <span className="text-base font-medium">{getCategoryDisplayName(activeCategory)}</span>
                            <ChevronDown size={20} className={`transition-transform ${isMobileCategoryOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isMobileCategoryOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsMobileCategoryOpen(false)} />
                                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 overflow-hidden">
                                    {categories.map((category) => (
                                        <button
                                            key={category.value}
                                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                                activeCategory === category.value ? 'bg-gray-100 font-medium' : ''
                                            }`}
                                            onClick={() => {
                                                handleCategoryClick(category.value)
                                                setIsMobileCategoryOpen(false)
                                            }}
                                        >
                                            {category.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="relative ml-auto">
                        <FilterButton 
                            isActive={isFilterOpen} 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            icon={<Filter size={16} />}
                        >
                            FILTERS
                        </FilterButton>
                        
                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                                <div className={`absolute right-0 top-full mt-3 z-20 bg-white text-black rounded-2xl shadow-xl w-[300px] max-w-[calc(100vw-56px)] p-6 transition-all duration-200 ease-in transform ${filterEntered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                    <h4 className="text-lg font-semibold mb-4">Filter by</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <h5 className="text-sm font-medium mb-2 text-gray-600">Price Range</h5>
                                            <div className="space-y-2">
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.priceRange.includes('under-10000')}
                                                        onChange={() => handleFilterChange('priceRange', 'under-10000')}
                                                    />
                                                    <span className="text-sm">Under ₦10,000</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.priceRange.includes('10000-25000')}
                                                        onChange={() => handleFilterChange('priceRange', '10000-25000')}
                                                    />
                                                    <span className="text-sm">₦10,000 - ₦25,000</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.priceRange.includes('25000-50000')}
                                                        onChange={() => handleFilterChange('priceRange', '25000-50000')}
                                                    />
                                                    <span className="text-sm">₦25,000 - ₦50,000</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.priceRange.includes('above-50000')}
                                                        onChange={() => handleFilterChange('priceRange', 'above-50000')}
                                                    />
                                                    <span className="text-sm">Above ₦50,000</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-medium mb-2 text-gray-600">Size</h5>
                                            <div className="space-y-2">
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.size.includes('XS')}
                                                        onChange={() => handleFilterChange('size', 'XS')}
                                                    />
                                                    <span className="text-sm">XS</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.size.includes('S')}
                                                        onChange={() => handleFilterChange('size', 'S')}
                                                    />
                                                    <span className="text-sm">S</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.size.includes('M')}
                                                        onChange={() => handleFilterChange('size', 'M')}
                                                    />
                                                    <span className="text-sm">M</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.size.includes('L')}
                                                        onChange={() => handleFilterChange('size', 'L')}
                                                    />
                                                    <span className="text-sm">L</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.size.includes('XL')}
                                                        onChange={() => handleFilterChange('size', 'XL')}
                                                    />
                                                    <span className="text-sm">XL</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-medium mb-2 text-gray-600">Category</h5>
                                            <div className="space-y-2">
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.category.includes('shirts')}
                                                        onChange={() => handleFilterChange('category', 'shirts')}
                                                    />
                                                    <span className="text-sm">Shirts</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.category.includes('caps')}
                                                        onChange={() => handleFilterChange('category', 'caps')}
                                                    />
                                                    <span className="text-sm">Caps</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.category.includes('hoodies')}
                                                        onChange={() => handleFilterChange('category', 'hoodies')}
                                                    />
                                                    <span className="text-sm">Hoodies</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.category.includes('sweaters')}
                                                        onChange={() => handleFilterChange('category', 'sweaters')}
                                                    />
                                                    <span className="text-sm">Sweaters</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="mr-2" 
                                                        checked={filters.category.includes('shoes')}
                                                        onChange={() => handleFilterChange('category', 'shoes')}
                                                    />
                                                    <span className="text-sm">Shoes</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button 
                                            className="flex-1 bg-gray-200 text-gray-700 rounded-full px-4 py-2 text-sm font-semibold hover:bg-gray-300 transition-colors"
                                            onClick={clearFilters}
                                        >
                                            Clear All
                                        </button>
                                        <button 
                                            className="flex-1 bg-black text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-black/90 transition-colors"
                                            onClick={applyFilters}
                                        >
                                            Apply Filters
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

              
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filteredProducts.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                         {filteredProducts.map((item) => {
                            
                             if (item.isDesign) {
                                 return (
                                     <div
                                         key={item.id}
                                         className="bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer"
                                         onClick={() => navigate(`/product/${item.id}`)}
                                     >
                                         <div className="rounded-2xl bg-[#eeeeee] mb-4">
                                        <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center relative">
                                                <img 
                                                    src="/shirtfront.png" 
                                                    alt="Shirt Mockup" 
                                                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                                                    style={{ 
                                                        filter: item.design.color === '#FFFFFF' ? 'none' : 
                                                               item.design.color === '#000000' ? 'brightness(0)' : 'none'
                                                    }}
                                                />
                                                {item.design.frontDesign?.url && (
                                                    <div 
                                                        className="absolute"
                                                        style={{ 
                                                            width: '50%', 
                                                            height: 'auto',
                                                            maxWidth: '145px',
                                                            maxHeight: '200px',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)'
                                                        }}
                                                    >
                                                        <img 
                                                            src={item.design.frontDesign.url} 
                                                            alt="Design" 
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                                {!item.design.frontDesign?.url && item.design.frontDesign?.dataUrl && (
                                                    <div 
                                                        className="absolute"
                                                        style={{ 
                                                            width: '50%', 
                                                            height: 'auto',
                                                            maxWidth: '145px',
                                                            maxHeight: '200px',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)'
                                                        }}
                                                    >
                                                        <img 
                                                            src={item.design.frontDesign.dataUrl} 
                                                            alt="Design" 
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                                {!item.design.frontDesign?.url && !item.design.frontDesign?.dataUrl && (
                                                    <div className="text-center text-gray-500">
                                                        <div className="text-4xl mb-2">👕</div>
                                                        <p className="text-sm">{item.design.type}</p>
                                                    </div>
                                                )}
                                            </div>
                                         </div>
                                         <div>
                                             <h3 className="text-[22px] font-semibold leading-tight mb-1">{item.title}</h3>
                                             <p className="text-[14px] text-black/60 mb-3">By {item.creator}</p>
                                             <p className="text-[22px] font-semibold">{item.price}</p>
                                         </div>
                                     </div>
                                 )
                             } else {
                                        
                                 return (
                                     <ProductCard
                                         key={item.id}
                                         image={item.image}
                                         title={item.title}
                                         creator={item.creator}
                                         price={item.price}
                                         alt={item.title}
                                         onClick={() => navigate(`/product/${item.id}`)}
                                     />
                                 )
                             }
                         })}
                     </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="max-w-md mx-auto">
                            <div className="text-gray-400 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
                            <p className="text-gray-500 mb-6">
                                Try adjusting your filters or resetting them to see more products.
                            </p>
                            <button 
                                className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-black/90 transition-colors"
                                onClick={clearFilters}
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
            </section>
            
            <Banner />
            <Footer />
        </div>
    )
}

export default Shop
