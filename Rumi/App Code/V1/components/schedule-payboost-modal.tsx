"use client"

import { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, Loader2, CheckCircle2, Clock } from "lucide-react"

interface SchedulePayboostModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (scheduledDate: Date) => Promise<void>
  boostPercent: number
  durationDays?: number
  minDate?: Date
  maxDate?: Date
}

/**
 * REUSABLE PAY BOOST (COMMISSION BOOST) SCHEDULING MODAL
 *
 * Used across Home, Rewards, and Missions pages when claiming commission boost benefits.
 *
 * Features:
 * - Date picker (today through +7 days)
 * - Fixed time: 6:00 PM ET (no time selection needed)
 * - Shows time in user's local timezone
 * - Validation (no past dates, within 7-day window, weekdays only)
 * - Loading state during API call
 * - Converts to UTC for backend
 *
 * Backend expects: POST /api/benefits/:id/claim
 * Request body: { scheduled_activation_at: ISO8601_timestamp }
 */
export function SchedulePayboostModal({
  open,
  onClose,
  onConfirm,
  boostPercent,
  durationDays = 30,
  minDate = new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow (no same-day scheduling)
  maxDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // Tomorrow + 7 days = 8 days from now
}: SchedulePayboostModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Detect user's timezone
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  // Fixed time for commission boost: 6:00 PM ET
  const FIXED_HOUR_ET = 18 // 6 PM in 24-hour format
  const FIXED_MINUTE_ET = 0

  // Get user's timezone abbreviation
  const getUserTimezoneAbbr = (): string => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      timeZoneName: "short",
    })
    const parts = formatter.formatToParts(now)
    const tzPart = parts.find((part) => part.type === "timeZoneName")
    return tzPart?.value || ""
  }

  // Convert 6 PM ET to user's local time for display
  const getLocalTimeDisplay = (): string => {
    // Create a date in ET timezone at 6 PM
    const now = new Date()
    const etString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T18:00:00`

    // Parse as ET time (EST is UTC-5)
    const utcDate = new Date(etString + "-05:00")

    // Format in user's local timezone
    const localFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    return localFormatter.format(utcDate)
  }

  const localTimeDisplay = getLocalTimeDisplay()

  // Convert date to DateTime with fixed 6 PM ET time
  const convertToDateTime = (date: Date): Date => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    // Create date string in ET with 6 PM time
    const etDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T18:00:00-05:00`

    // Parse as UTC
    return new Date(etDateString)
  }

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: userTimezone,
    })
  }

  // Check if date is a weekday (Monday-Friday)
  const isWeekday = (date: Date): boolean => {
    const day = date.getDay()
    return day >= 1 && day <= 5 // 1 = Monday, 5 = Friday
  }

  const handleConfirm = async () => {
    if (!selectedDate) return

    setIsSubmitting(true)

    try {
      // Combine date + fixed 6 PM ET time and convert to UTC
      const combinedDateTime = convertToDateTime(selectedDate)

      // Call parent's onConfirm with UTC timestamp
      await onConfirm(combinedDateTime)

      // Reset state and close
      setSelectedDate(undefined)
      onClose()
    } catch (error) {
      console.error("Failed to schedule pay boost:", error)
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return // Prevent closing during submission
    setSelectedDate(undefined)
    onClose()
  }

  const isConfirmDisabled = !selectedDate || isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Schedule Activation
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Lock in your{" "}
            <span className="font-semibold text-slate-900">
              +{boostPercent}% Pay Boost for {durationDays} Days 💰
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Picker */}
          <div>
            <label className="text-sm font-semibold text-slate-900 mb-3 block">
              Select Date
            </label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const tomorrow = new Date(today)
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  const dateToCheck = new Date(date)
                  dateToCheck.setHours(0, 0, 0, 0)

                  // Disable if:
                  // 1. Before tomorrow (no same-day scheduling)
                  // 2. After maxDate (beyond 7-day window)
                  // 3. Weekend (Saturday or Sunday)
                  return (
                    dateToCheck < tomorrow ||
                    dateToCheck > maxDate ||
                    !isWeekday(dateToCheck)
                  )
                }}
                className="rounded-md border border-slate-200"
              />
            </div>
          </div>

          {/* Fixed Time Display */}
          <div>
            <label className="text-sm font-semibold text-slate-900 mb-3 block">
              Activation Time
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <Clock className="h-5 w-5 text-slate-600" />
                <p className="text-lg font-semibold text-slate-900">
                  {localTimeDisplay} {getUserTimezoneAbbr()}
                </p>
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">
                All commission boosts activate at this time
              </p>
            </div>
          </div>

          {/* Selected Summary */}
          {selectedDate && (
            <div className="bg-white border-2 border-green-500 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold text-green-700">Locked in!</p>
              </div>
              <p className="text-base font-semibold text-slate-900 mb-1">
                {formatDate(selectedDate)} at {localTimeDisplay}
              </p>
              <p className="text-xs text-slate-600">
                +{boostPercent}% commission boost activates then—watch your earnings grow! 💸
              </p>
            </div>
          )}
        </div>

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
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Activation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
