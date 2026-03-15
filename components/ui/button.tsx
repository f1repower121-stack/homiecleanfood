import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'default' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', ...props }, ref) => {
    const variants = {
      primary: 'bg-homie-green text-white hover:bg-homie-lime',
      secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200',
      outline: 'border border-stone-300 text-stone-700 hover:bg-stone-50',
      ghost: 'text-stone-600 hover:bg-stone-100',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-xl',
      default: 'px-4 py-2.5 text-sm font-semibold rounded-xl',
      lg: 'px-6 py-3 text-base font-semibold rounded-xl',
    }
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-homie-lime focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { Button }
