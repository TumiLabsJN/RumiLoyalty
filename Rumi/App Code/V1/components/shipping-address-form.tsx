"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

// US States for dropdown
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

export interface ShippingAddress {
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_postal_code: string
  shipping_country: string
  shipping_phone: string
}

interface ValidationErrors {
  shipping_address_line1?: string
  shipping_city?: string
  shipping_state?: string
  shipping_postal_code?: string
  shipping_country?: string
  shipping_phone?: string
}

interface ShippingAddressFormProps {
  onSubmit: (address: ShippingAddress) => void
  isSubmitting: boolean
  initialData?: Partial<ShippingAddress>
}

export function ShippingAddressForm({ onSubmit, isSubmitting, initialData }: ShippingAddressFormProps) {
  // TODO (API Integration): Add support for saved shipping addresses
  // When implementing the claim API endpoint, consider:
  // 1. Fetching user's previously saved shipping address (if exists)
  // 2. Pre-populating form fields via initialData prop
  // 3. Adding "Use saved address" checkbox/option
  // 4. Allowing users to update their default shipping address
  // Reference: physical_gift_redemptions table schema in SchemaFinalv2.md

  const firstInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<ShippingAddress>({
    shipping_address_line1: initialData?.shipping_address_line1 || "",
    shipping_address_line2: initialData?.shipping_address_line2 || "",
    shipping_city: initialData?.shipping_city || "",
    shipping_state: initialData?.shipping_state || "",
    shipping_postal_code: initialData?.shipping_postal_code || "",
    shipping_country: "USA", // US-only, locked
    shipping_phone: initialData?.shipping_phone || "",
  })

  const [errors, setErrors] = useState<ValidationErrors>({})

  // Autofocus first field when form mounts
  useEffect(() => {
    if (!isSubmitting) {
      firstInputRef.current?.focus()
    }
  }, [isSubmitting])

  const validateField = (name: keyof ShippingAddress, value: string): string | undefined => {
    switch (name) {
      case "shipping_address_line1":
        if (!value.trim()) return "Street address is required"
        if (value.length > 255) return "Address must be 255 characters or less"
        return undefined

      case "shipping_city":
        if (!value.trim()) return "City is required"
        if (value.length > 100) return "City must be 100 characters or less"
        if (!/^[a-zA-Z\s\-'.]+$/.test(value)) return "City contains invalid characters"
        return undefined

      case "shipping_state":
        if (!value.trim()) return "State/Province is required"
        if (value.length > 100) return "State must be 100 characters or less"
        return undefined

      case "shipping_postal_code":
        if (!value.trim()) return "Postal code is required"
        if (value.length > 20) return "Postal code must be 20 characters or less"
        return undefined

      case "shipping_country":
        if (!value.trim()) return "Country is required"
        if (value.length > 100) return "Country must be 100 characters or less"
        return undefined

      case "shipping_phone":
        if (!value.trim()) return "Phone number is required"
        if (value.length > 50) return "Phone number must be 50 characters or less"
        return undefined

      default:
        return undefined
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user selects
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const error = validateField(name as keyof ShippingAddress, value)

    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Validate all required fields
    const requiredFields: (keyof ShippingAddress)[] = [
      "shipping_address_line1",
      "shipping_city",
      "shipping_state",
      "shipping_postal_code",
      "shipping_country",
      "shipping_phone"
    ]

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        newErrors[field as keyof ValidationErrors] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const isFormValid =
    formData.shipping_address_line1.trim() !== "" &&
    formData.shipping_city.trim() !== "" &&
    formData.shipping_state.trim() !== "" &&
    formData.shipping_postal_code.trim() !== "" &&
    formData.shipping_country.trim() !== "" &&
    formData.shipping_phone.trim() !== "" &&
    Object.keys(errors).length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {/* Address Line 1 - Required */}
      <div className="space-y-2">
        <Label htmlFor="shipping_address_line1" className="text-sm font-medium text-slate-700">
          Street Address <span className="text-red-500">*</span>
        </Label>
        <Input
          ref={firstInputRef}
          id="shipping_address_line1"
          name="shipping_address_line1"
          type="text"
          placeholder="123 Main Street"
          value={formData.shipping_address_line1}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          className={errors.shipping_address_line1 ? "border-red-500" : ""}
          maxLength={255}
        />
        {errors.shipping_address_line1 && (
          <p className="text-sm text-red-500">{errors.shipping_address_line1}</p>
        )}
      </div>

      {/* Address Line 2 - Optional */}
      <div className="space-y-2">
        <Label htmlFor="shipping_address_line2" className="text-sm font-medium text-slate-700">
          Apartment, Suite, Unit <span className="text-slate-500">(Optional)</span>
        </Label>
        <Input
          id="shipping_address_line2"
          name="shipping_address_line2"
          type="text"
          placeholder="Apt, Suite, Unit, etc."
          value={formData.shipping_address_line2}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={255}
        />
      </div>

      {/* City - Required */}
      <div className="space-y-2">
        <Label htmlFor="shipping_city" className="text-sm font-medium text-slate-700">
          City <span className="text-red-500">*</span>
        </Label>
        <Input
          id="shipping_city"
          name="shipping_city"
          type="text"
          placeholder="New York"
          value={formData.shipping_city}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          className={errors.shipping_city ? "border-red-500" : ""}
          maxLength={100}
        />
        {errors.shipping_city && (
          <p className="text-sm text-red-500">{errors.shipping_city}</p>
        )}
      </div>

      {/* State and Postal Code - Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* State - Required (Dropdown) */}
        <div className="space-y-2">
          <Label htmlFor="shipping_state" className="text-sm font-medium text-slate-700">
            State <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.shipping_state}
            onValueChange={(value) => handleSelectChange("shipping_state", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger
              id="shipping_state"
              className={errors.shipping_state ? "border-red-500" : ""}
            >
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.shipping_state && (
            <p className="text-sm text-red-500">{errors.shipping_state}</p>
          )}
        </div>

        {/* Postal Code - Required */}
        <div className="space-y-2">
          <Label htmlFor="shipping_postal_code" className="text-sm font-medium text-slate-700">
            ZIP Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="shipping_postal_code"
            name="shipping_postal_code"
            type="text"
            placeholder="10001"
            value={formData.shipping_postal_code}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            className={errors.shipping_postal_code ? "border-red-500" : ""}
            maxLength={20}
          />
          {errors.shipping_postal_code && (
            <p className="text-sm text-red-500">{errors.shipping_postal_code}</p>
          )}
        </div>
      </div>

      {/* Country - US Only (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="shipping_country" className="text-sm font-medium text-slate-700">
          Country <span className="text-red-500">*</span>
        </Label>
        <Input
          id="shipping_country"
          name="shipping_country"
          type="text"
          value="USA"
          readOnly
          disabled
          className="bg-slate-100 cursor-not-allowed"
        />
        <p className="text-xs text-slate-500">
          Currently shipping to USA only
        </p>
      </div>

      {/* Phone - Required */}
      <div className="space-y-2">
        <Label htmlFor="shipping_phone" className="text-sm font-medium text-slate-700">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="shipping_phone"
          name="shipping_phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={formData.shipping_phone}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          className={errors.shipping_phone ? "border-red-500" : ""}
          maxLength={50}
        />
        {errors.shipping_phone && (
          <p className="text-sm text-red-500">{errors.shipping_phone}</p>
        )}
        <p className="text-xs text-slate-500">
          For delivery notifications and questions
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={!isFormValid || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit & Claim Reward"
        )}
      </Button>
    </form>
  )
}
