import * as React from "react"
import PhoneInput from "react-phone-number-input"
import { cn } from "@/lib/utils"
import 'react-phone-number-input/style.css'

export interface PhoneInputWithCountryProps {
  value?: string
  onChange?: (value: string | undefined) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}

const PhoneInputWithCountry = React.forwardRef<any, PhoneInputWithCountryProps>(
  ({ className, value, onChange, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <PhoneInput
          ref={ref}
          value={value}
          onChange={onChange}
          international
          defaultCountry="US"
          className="flex items-center"
          inputClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          countrySelectProps={{
            className: "mr-2 border-0 bg-transparent focus:outline-none"
          }}
          {...props}
        />
      </div>
    )
  }
)
PhoneInputWithCountry.displayName = "PhoneInputWithCountry"

export { PhoneInputWithCountry }