import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={`flex h-10 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-homie-dark placeholder:text-homie-gray focus:border-homie-lime focus:outline-none focus:ring-1 focus:ring-homie-lime disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = 'Input'
export { Input }
