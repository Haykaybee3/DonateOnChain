import React from 'react'

type NFTcardProps = {
    image: string
    title: string
}

const NFTcard: React.FC<NFTcardProps> = ({
    image,
    title
}) => {
    return (
        <div className="bg-white rounded-3xl p-4">
            <div className="rounded-2xl bg-[#eeeeee] mb-4">
                <div className="aspect-square rounded-xl overflow-hidden bg-[#eeeeee] flex items-center justify-center">
                    <img
                        src={image}
                        alt="NFT"
                        className="w-[85%] h-[85%] object-contain"
                    />
                </div>
            </div>
            <div>
                <h3 className="text-[22px] font-semibold leading-tight mb-1">
                    {title}
                </h3>
            </div>
        </div>
    )
}

export default NFTcard
