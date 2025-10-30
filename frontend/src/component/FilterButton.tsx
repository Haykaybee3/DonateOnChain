import React from 'react'

type FilterButtonProps = {
    children: React.ReactNode
    isActive?: boolean
    onClick?: () => void
    className?: string
    icon?: React.ReactNode
}

const FilterButton: React.FC<FilterButtonProps> = ({
    children,
    isActive = false,
    onClick,
    className = "",
    icon
}) => {
    const baseStyles = "rounded-full px-6 py-3 text-sm font-semibold transition-colors inline-flex items-center"
    const activeStyles = "bg-black text-white"
    const inactiveStyles = "bg-white text-black border border-gray-300 hover:bg-gray-100"
    
    return (
        <button 
            className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles} ${className}`}
            onClick={onClick}
        >
            {icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    )
}

export default FilterButton
