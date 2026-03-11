import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', ...props }, ref) => {
    const variants = {
      primary: 'bg-homie-lime text-white hover:bg-homie-green',
      secondary: 'bg-homie-cream text-homie-dark hover:bg-gray-200',
      outline: 'border-2 border-homie-green text-homie-green hover:bg-homie-cream',
      ghost: 'text-homie-gray hover:bg-homie-cream hover:text-homie-dark',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      default: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    }
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-homie-lime focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { Button }
