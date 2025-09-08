import * as React from "react"
import PhoneInput from "react-phone-number-input"
import { cn } from "@/lib/utils"
import 'react-phone-number-input/style.css'
import './phone-input.css'

export interface PhoneInputWithCountryProps
  extends Omit<React.ComponentProps<typeof PhoneInput>, 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string | undefined) => void
}

const PhoneInputWithCountry = React.forwardRef<any, PhoneInputWithCountryProps>(
  ({ className, value, onChange, ...props }, ref) => {
    return (
      <PhoneInput
        ref={ref}
        className={cn("PhoneInput", className)}
        value={value}
        onChange={onChange}
        international
        defaultCountry="US"
        {...props}
      />
    )
  }
)
PhoneInputWithCountry.displayName = "PhoneInputWithCountry"

export { PhoneInputWithCountry }