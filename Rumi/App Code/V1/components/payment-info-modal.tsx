"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { CircleDollarSign, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface PaymentInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rewardId: string
  rewardName: string
  onSuccess: () => void
}

interface SavedPaymentInfo {
  hasPaymentInfo: boolean
  paymentMethod: 'paypal' | 'venmo' | null
  paymentAccount: string | null  // Full unmasked account (user is authenticated)
}

/**
 * PAYMENT INFO MODAL FOR COMMISSION BOOST REWARDS
 *
 * Collects PayPal or Venmo payment information after commission boost expires.
 *
 * Features:
 * - Fetches saved payment info from user profile
 * - Pre-fills form if user has saved payment method
 * - Validates PayPal email format and Venmo @handle
 * - Confirms account by requiring duplicate entry
 * - Option to save as default for future use
 * - Yellow theme matching "pending_info" status
 *
 * API Endpoints:
 * - GET /api/user/payment-info (fetch saved info)
 * - POST /api/rewards/:id/payment-info (submit payment info)
 */
export function PaymentInfoModal({
  open,
  onOpenChange,
  rewardId,
  rewardName,
  onSuccess,
}: PaymentInfoModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'venmo'>('paypal')
  const [paymentAccount, setPaymentAccount] = useState('')
  const [paymentAccountConfirm, setPaymentAccountConfirm] = useState('')
  const [saveAsDefault, setSaveAsDefault] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSavedInfo, setIsLoadingSavedInfo] = useState(false)
  const [savedPaymentInfo, setSavedPaymentInfo] = useState<SavedPaymentInfo | null>(null)
  const [errors, setErrors] = useState<{
    paymentAccount?: string
    paymentAccountConfirm?: string
  }>({})

  // Fetch saved payment info when modal opens
  useEffect(() => {
    if (open) {
      fetchSavedPaymentInfo()
    }
  }, [open])

  const fetchSavedPaymentInfo = async () => {
    setIsLoadingSavedInfo(true)
    try {
      // TODO: GET /api/user/payment-info
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock response (replace with actual API call)
      const mockSavedInfo: SavedPaymentInfo = {
        hasPaymentInfo: true, // Change to false to test without saved info
        paymentMethod: 'paypal',
        paymentAccount: 'john@example.com',  // Full unmasked account
      }

      setSavedPaymentInfo(mockSavedInfo)

      // Pre-fill form if saved info exists
      if (mockSavedInfo.hasPaymentInfo && mockSavedInfo.paymentMethod && mockSavedInfo.paymentAccount) {
        setPaymentMethod(mockSavedInfo.paymentMethod)
        setPaymentAccount(mockSavedInfo.paymentAccount)
        setPaymentAccountConfirm(mockSavedInfo.paymentAccount)
      }
    } catch (error) {
      console.error("Failed to fetch saved payment info:", error)
      // Continue without saved info
      setSavedPaymentInfo(null)
    } finally {
      setIsLoadingSavedInfo(false)
    }
  }

  // Validate PayPal email format
  const validatePayPalEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate Venmo handle format
  const validateVenmoHandle = (handle: string): boolean => {
    return handle.startsWith('@') && handle.length > 1
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // Validate payment account
    if (!paymentAccount.trim()) {
      newErrors.paymentAccount = 'Payment account is required'
    } else if (paymentMethod === 'paypal' && !validatePayPalEmail(paymentAccount)) {
      newErrors.paymentAccount = 'Please enter a valid email address'
    } else if (paymentMethod === 'venmo' && !validateVenmoHandle(paymentAccount)) {
      newErrors.paymentAccount = 'Venmo handle must start with @'
    }

    // Validate confirmation
    if (!paymentAccountConfirm.trim()) {
      newErrors.paymentAccountConfirm = 'Please confirm your payment account'
    } else if (paymentAccount !== paymentAccountConfirm) {
      newErrors.paymentAccountConfirm = 'Payment accounts do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: POST /api/rewards/:id/payment-info
      // Request body: { paymentMethod, paymentAccount, paymentAccountConfirm, saveAsDefault }
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      toast.success("Payment info submitted", {
        description: "Your reward will be sent after the clearing period",
        duration: 5000,
      })

      // Reset form
      resetForm()

      // Call success callback to refresh rewards data
      onSuccess()

      // Close modal
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to submit payment info:", error)
      toast.error("Failed to submit payment info", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setPaymentAccount('')
    setPaymentAccountConfirm('')
    setSaveAsDefault(true)
    setErrors({})
  }

  const handleClose = () => {
    if (isSubmitting) return // Prevent closing during submission
    resetForm()
    onOpenChange(false)
  }

  const isSubmitDisabled = isSubmitting || !paymentAccount.trim() || !paymentAccountConfirm.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-yellow-100 rounded-full p-2">
              <CircleDollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Set Up Payout Info
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600">
            Your <span className="font-semibold text-slate-900">{rewardName}</span> has ended!
            Enter your payment details to receive your earnings after the clearing period.
          </DialogDescription>
        </DialogHeader>

        {isLoadingSavedInfo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Saved Payment Info Banner */}
            {savedPaymentInfo?.hasPaymentInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Saved payment method found</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Last used: {savedPaymentInfo.paymentMethod === 'paypal' ? 'PayPal' : 'Venmo'}
                      {savedPaymentInfo.paymentAccount && ` (${savedPaymentInfo.paymentAccount})`}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Your saved info has been pre-filled. Update if needed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-900">
                Payment Method
              </Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value as 'paypal' | 'venmo')
                  setErrors({}) // Clear errors when switching methods
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="font-medium cursor-pointer">
                    PayPal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="venmo" id="venmo" />
                  <Label htmlFor="venmo" className="font-medium cursor-pointer">
                    Venmo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Account Input */}
            <div className="space-y-2">
              <Label htmlFor="paymentAccount" className="text-sm font-semibold text-slate-900">
                {paymentMethod === 'paypal' ? 'PayPal Email' : 'Venmo Handle'}
              </Label>
              <Input
                id="paymentAccount"
                type="text"
                placeholder={paymentMethod === 'paypal' ? 'your.email@example.com' : '@yourhandle'}
                value={paymentAccount}
                onChange={(e) => {
                  setPaymentAccount(e.target.value)
                  setErrors({ ...errors, paymentAccount: undefined })
                }}
                className={errors.paymentAccount ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.paymentAccount && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.paymentAccount}</span>
                </div>
              )}
            </div>

            {/* Payment Account Confirmation */}
            <div className="space-y-2">
              <Label htmlFor="paymentAccountConfirm" className="text-sm font-semibold text-slate-900">
                Confirm {paymentMethod === 'paypal' ? 'Email' : 'Handle'}
              </Label>
              <Input
                id="paymentAccountConfirm"
                type="text"
                placeholder={paymentMethod === 'paypal' ? 'Re-enter your email' : 'Re-enter your handle'}
                value={paymentAccountConfirm}
                onChange={(e) => {
                  setPaymentAccountConfirm(e.target.value)
                  setErrors({ ...errors, paymentAccountConfirm: undefined })
                }}
                className={errors.paymentAccountConfirm ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.paymentAccountConfirm && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.paymentAccountConfirm}</span>
                </div>
              )}
            </div>

            {/* Save as Default Checkbox */}
            <div className="flex items-start space-x-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <Checkbox
                id="saveAsDefault"
                checked={saveAsDefault}
                onCheckedChange={(checked) => setSaveAsDefault(checked === true)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <Label
                  htmlFor="saveAsDefault"
                  className="text-sm font-medium text-slate-900 cursor-pointer"
                >
                  Save as my default payment method
                </Label>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pre-fill this info for future commission boost payouts
                </p>
              </div>
            </div>

          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Payment Info"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
