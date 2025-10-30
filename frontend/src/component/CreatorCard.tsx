import React from 'react'

type CreatorCardProps = {
    image: string
    name: string
    role: string
    alt?: string
    className?: string
}

const CreatorCard: React.FC<CreatorCardProps> = ({
    image,
    name,
    role,
    alt = "Creator",
    className = ""
}) => {
    return (
        <div className={`rounded-3xl p-4 hover:border hover:border-black/10 transition-colors text-center ${className}`}>
            <div className="rounded-full bg-[#eeeeee] w-32 h-32 lg:w-[250px] lg:h-[250px] mx-auto flex items-center justify-center">
                <img
                    src={image}
                    alt={alt}
                    className="w-[85%] h-[85%] object-contain rounded-full"
                />
            </div>
            <div className="mt-4">
                <h3 className="text-[22px] font-semibold leading-tight">
                    {name}
                </h3>
                <p className="text-[14px] text-black/60">{role}</p>
            </div>
        </div>
    )
}

export default CreatorCard
