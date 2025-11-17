"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

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
}

interface ShippingAddressFormProps {
  onSubmit: (address: ShippingAddress) => void
  isSubmitting: boolean
  initialData?: Partial<ShippingAddress>
}

export function ShippingAddressForm({ onSubmit, isSubmitting, initialData }: ShippingAddressFormProps) {
  const [formData, setFormData] = useState<ShippingAddress>({
    shipping_address_line1: initialData?.shipping_address_line1 || "",
    shipping_address_line2: initialData?.shipping_address_line2 || "",
    shipping_city: initialData?.shipping_city || "",
    shipping_state: initialData?.shipping_state || "",
    shipping_postal_code: initialData?.shipping_postal_code || "",
    shipping_country: initialData?.shipping_country || "USA",
    shipping_phone: initialData?.shipping_phone || "",
  })

  const [errors, setErrors] = useState<ValidationErrors>({})

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
      "shipping_country"
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
    Object.keys(errors).length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {/* Address Line 1 - Required */}
      <div className="space-y-2">
        <Label htmlFor="shipping_address_line1" className="text-sm font-medium text-slate-700">
          Street Address <span className="text-red-500">*</span>
        </Label>
        <Input
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
          Apartment, Suite, Unit (Optional)
        </Label>
        <Input
          id="shipping_address_line2"
          name="shipping_address_line2"
          type="text"
          placeholder="Apt 4B"
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
        {/* State - Required */}
        <div className="space-y-2">
          <Label htmlFor="shipping_state" className="text-sm font-medium text-slate-700">
            State <span className="text-red-500">*</span>
          </Label>
          <Input
            id="shipping_state"
            name="shipping_state"
            type="text"
            placeholder="NY"
            value={formData.shipping_state}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            className={errors.shipping_state ? "border-red-500" : ""}
            maxLength={100}
          />
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

      {/* Country - Required */}
      <div className="space-y-2">
        <Label htmlFor="shipping_country" className="text-sm font-medium text-slate-700">
          Country <span className="text-red-500">*</span>
        </Label>
        <Input
          id="shipping_country"
          name="shipping_country"
          type="text"
          value={formData.shipping_country}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          className={errors.shipping_country ? "border-red-500" : ""}
          maxLength={100}
        />
        {errors.shipping_country && (
          <p className="text-sm text-red-500">{errors.shipping_country}</p>
        )}
      </div>

      {/* Phone - Optional */}
      <div className="space-y-2">
        <Label htmlFor="shipping_phone" className="text-sm font-medium text-slate-700">
          Phone Number (Optional)
        </Label>
        <Input
          id="shipping_phone"
          name="shipping_phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={formData.shipping_phone}
          onChange={handleChange}
          disabled={isSubmitting}
          maxLength={50}
        />
        <p className="text-xs text-slate-500">
          We'll only use this if there are delivery questions
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
