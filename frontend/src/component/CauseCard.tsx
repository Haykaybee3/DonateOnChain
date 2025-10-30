import React from 'react'

type CauseCardProps = {
    image: string
    title: string
    organization: string
    alt?: string
    className?: string
}

const CauseCard: React.FC<CauseCardProps> = ({
    image,
    title,
    organization,
    alt = "Cause",
    className = ""
}) => {
    return (
        <div className={`rounded-3xl p-4 hover:border hover:border-black/10 transition-colors ${className}`}>
            <div className="rounded-2xl bg-[#eeeeee]">
                <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center">
                    <img
                        src={image}
                        alt={alt}
                        className="w-[85%] h-[85%] object-contain"
                    />
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-[22px] font-semibold leading-tight">
                    {title}
                </h3>
                <p className="text-[14px] text-black/60">{organization}</p>
            </div>
        </div>
    )
}

export default CauseCard
