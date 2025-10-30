import React from 'react'

type ProductCardProps = {
    image: string
    title: string
    creator: string
    price: string
    alt?: string
    className?: string
    onClick?: () => void
}

const ProductCard: React.FC<ProductCardProps> = ({
    image,
    title,
    creator,
    price,
    alt = "Product",
    className = "",
    onClick
}) => {
    return (
        <div 
            className={`bg-white rounded-3xl p-4 hover:border hover:border-black/10 transition-colors cursor-pointer ${className}`}
            onClick={onClick}
        >
            <div className="rounded-2xl bg-[#eeeeee] mb-4">
                <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center">
                    <img
                        src={image}
                        alt={alt}
                        className="w-[85%] h-[85%] object-contain"
                    />
                </div>
            </div>
            <div>
                <h3 className="text-[22px] font-semibold leading-tight mb-1">
                    {title}
                </h3>
                <p className="text-[14px] text-black/60 mb-3">By {creator}</p>
                <p className="text-[22px] font-semibold">{price}</p>
            </div>
        </div>
    )
}

export default ProductCard
