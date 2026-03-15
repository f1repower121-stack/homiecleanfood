import * as React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={`flex h-11 w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-homie-green focus:outline-none focus:ring-2 focus:ring-homie-green/20 disabled:opacity-50 disabled:bg-stone-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = 'Input'
export { Input }
