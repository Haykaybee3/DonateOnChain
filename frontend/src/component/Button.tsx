import React from 'react'

type ButtonVariant = 'primary' | 'primary-bw' | 'secondary' | 'inactive' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
    children: React.ReactNode,
    variant?: ButtonVariant,
    size?: ButtonSize,
    className?: string,
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const baseStyles = 'inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-black text-yellow-400 hover:bg-black/90 focus:ring-black',
    'primary-bw': 'bg-black text-white hover:bg-gray-800 focus:ring-black',
    secondary: 'bg-white text-black border border-gray-300 hover:bg-gray-100 focus:ring-gray-300',
    inactive: 'bg-gray-200 text-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}) => {
    const isDisabled = props.disabled ?? variant === 'inactive'
    const disabledClasses = isDisabled ? ' pointer-events-none' : ''
    const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}${disabledClasses}`
    return (
        <button className={classes} disabled={isDisabled} {...props}>
            {children}
        </button>
    )
}

export default Button


