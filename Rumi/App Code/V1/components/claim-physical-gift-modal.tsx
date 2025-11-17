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
  name: string
  type: "physical_gift"
  value_data: {
    requires_size?: boolean
    size_category?: string
    size_options?: string[]
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
  const requiresSize = reward.value_data.requires_size === true
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
      // Prepare payload
      const payload = {
        reward_id: reward.id,
        ...(requiresSize && { size_value: selectedSize }),
        ...address,
      }

      console.log("Submitting physical gift claim:", payload)

      // TODO: Replace with actual API call
      // await fetch("/api/rewards/claim-physical-gift", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // })

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Success!
      toast.success("Reward claimed successfully!", {
        description: "We'll ship your gift soon. Check your email for tracking info.",
        duration: 5000,
      })

      handleOpenChange(false)
      onSuccess()
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
                <span className="font-semibold text-slate-900">{reward.name}</span>
              </>
            ) : (
              <>
                Where should we send your{" "}
                <span className="font-semibold text-slate-900">{reward.name}</span>?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* SIZE SELECTION STEP */}
        {currentStep === "size" && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">
                {reward.value_data.size_category === "shoes" ? "Shoe Size" : "Size"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {reward.value_data.size_options?.map((size) => (
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
