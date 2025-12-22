"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShippingAddressForm, type ShippingAddress } from "./shipping-address-form"
import { Loader2, Package } from "lucide-react"
import { toast } from "sonner"

interface PhysicalGiftReward {
  id: string
  displayName: string
  rewardType: "physical_gift"
  valueData: {
    requiresSize?: boolean
    sizeCategory?: string
    sizeOptions?: string[]
  }
}

interface ClaimPhysicalGiftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reward: PhysicalGiftReward
  onSuccess: () => void
}

type ModalStep = "size" | "shipping"

export function ClaimPhysicalGiftModal({
  open,
  onOpenChange,
  reward,
  onSuccess,
}: ClaimPhysicalGiftModalProps) {
  const requiresSize = reward.valueData.requiresSize === true
  const [currentStep, setCurrentStep] = useState<ModalStep>(requiresSize ? "size" : "shipping")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset to initial state
      setCurrentStep(requiresSize ? "size" : "shipping")
      setSelectedSize("")
      setIsSubmitting(false)
    }
    onOpenChange(newOpen)
  }

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
  }

  const handleSizeContinue = () => {
    if (selectedSize) {
      setCurrentStep("shipping")
    }
  }

  const handleShippingSubmit = async (address: ShippingAddress) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/missions/${reward.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: requiresSize ? selectedSize : undefined,
          shippingAddress: {
            firstName: address.shipping_recipient_first_name,
            lastName: address.shipping_recipient_last_name,
            line1: address.shipping_address_line1,
            line2: address.shipping_address_line2 || undefined,
            city: address.shipping_city,
            state: address.shipping_state,
            postalCode: address.shipping_postal_code,
            country: address.shipping_country,
            phone: address.shipping_phone,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success("Reward claimed successfully!", {
            description: "We'll ship your gift soon. Check missions tab for updates.",
            duration: 5000,
          })
          handleOpenChange(false)
          onSuccess()
        } else {
          toast.error(data.message || "Failed to claim reward")
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to claim reward")
      }
    } catch (error) {
      console.error("Failed to claim physical gift:", error)
      toast.error("Failed to claim reward", {
        description: "Please try again or contact support if the issue persists.",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentStep === "shipping" && requiresSize) {
      setCurrentStep("size")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl font-bold text-slate-900">
              {currentStep === "size" ? "Select Size" : "Shipping Address"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600">
            {currentStep === "size" ? (
              <>
                Choose your size for{" "}
                <span className="font-semibold text-slate-900">{reward.displayName}</span>
              </>
            ) : (
              <>
                Where should we send your{" "}
                <span className="font-semibold text-slate-900">{reward.displayName}</span>?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* SIZE SELECTION STEP */}
        {currentStep === "size" && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">
                {reward.valueData.sizeCategory === "shoes" ? "Shoe Size" : "Size"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {reward.valueData.sizeOptions?.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={selectedSize === size ? "default" : "outline"}
                    className={
                      selectedSize === size
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "hover:bg-slate-100"
                    }
                    onClick={() => handleSizeSelect(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedSize}
              onClick={handleSizeContinue}
            >
              Continue to Shipping
            </Button>
          </div>
        )}

        {/* SHIPPING ADDRESS STEP */}
        {currentStep === "shipping" && (
          <div className="space-y-4">
            {/* Back button if came from size selection */}
            {requiresSize && (
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-slate-600 hover:text-slate-900 px-0"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                ← Back to Size Selection
              </Button>
            )}

            <ShippingAddressForm
              onSubmit={handleShippingSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
