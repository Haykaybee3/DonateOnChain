export const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="w-full aspect-square bg-gray-200 animate-pulse"></div>
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
    </div>
)

export const SkeletonCampaignCard = () => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
        <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="flex items-center justify-between pt-4">
                <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
            </div>
        </div>
    </div>
)

export const SkeletonCreatorCard = () => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
        <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
    </div>
)

export const SkeletonProfile = () => (
    <div className="space-y-6">
        <div className="relative">
            <div className="w-full h-64 bg-gray-200 rounded-t-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                <div className="w-32 h-32 bg-gray-200 rounded-full border-4 border-white animate-pulse"></div>
            </div>
        </div>
        <div className="px-4 pt-16 space-y-4">
            <div className="text-center space-y-2">
                <div className="h-8 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="text-center space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
        <div className="px-4 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                        <div className="p-4 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
)

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4">
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            </div>
        ))}
    </div>
)

export const SkeletonText = ({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) => (
    <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`}></div>
)

export const SkeletonButton = ({ width = 'w-32' }: { width?: string }) => (
    <div className={`${width} h-10 bg-gray-200 rounded animate-pulse`}></div>
)

export const SkeletonBanner = () => (
    <div className="w-full h-64 bg-gray-200 rounded-2xl animate-pulse"></div>
)

export const SkeletonGrid = ({ columns = 3, rows = 3 }: { columns?: number; rows?: number }) => (
    <div className={`grid grid-cols-${columns} gap-6`}>
        {[...Array(columns * rows)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden">
                <div className="w-full aspect-square bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            </div>
        ))}
    </div>
)

