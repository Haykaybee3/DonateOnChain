import React from 'react'

type CampaignCardProps = {
    image: string
    title: string
    amountRaised: string
    goal: string
    percentage: number
    alt?: string
    className?: string
    onClick?: () => void
}

const CampaignCard: React.FC<CampaignCardProps> = ({
    image,
    title,
    amountRaised,
    goal,
    percentage,
    alt = "Campaign",
    className = "",
    onClick
}) => {
    return (
        <div 
            className={`bg-white rounded-3xl overflow-hidden hover:border hover:border-black/10 transition-colors cursor-pointer group ${className}`}
            onClick={onClick}
        >
          
            <div className="relative aspect-[4/3] overflow-hidden">
                <img
                    src={image}
                    alt={alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
            </div>
            
          
            <div className="p-4">
                <h3 className="text-[20px] font-semibold leading-tight mb-3">
                    {title}
                </h3>
                
               
                <div className="relative h-12 rounded-full overflow-hidden bg-white border-2 border-gray-300">
                  
                    <div 
                        className="absolute inset-0 bg-[#4ADE80] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    >
                       
                        <div className="absolute left-0 top-0 h-full flex items-center px-4 min-w-fit">
                            <span className="text-[16px] font-semibold text-black whitespace-nowrap">{amountRaised}</span>
                        </div>
                    </div>
                    
                  
                    <div className="absolute right-4 top-0 h-full flex items-center z-10">
                        <span className="text-[16px] font-semibold text-black">{percentage}%</span>
                    </div>
                </div>
                
               
                <div className="mt-2 text-right">
                    <span className="text-sm text-gray-600">of {goal}</span>
                </div>
            </div>
        </div>
    )
}

export default CampaignCard

