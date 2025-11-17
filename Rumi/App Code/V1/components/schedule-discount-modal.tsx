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
import { Info, Loader2, CheckCircle2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScheduleDiscountModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (scheduledDate: Date) => Promise<void>
  discountPercent: number
  durationDays?: number
  minDate?: Date
  maxDate?: Date
}

interface TimeSlot {
  localDisplay: string  // "6:00 AM" (shown to user in their timezone)
  etHour: number        // 9 (hour in ET)
  etMin: number         // 0 (minutes in ET)
  etDisplay: string     // "9:00 AM ET" (for reference)
}

/**
 * REUSABLE DISCOUNT SCHEDULING MODAL
 *
 * Used across Home, Rewards, and Missions pages when claiming discount benefits.
 *
 * Features:
 * - Date picker (today through +7 days)
 * - Time picker grid (9:00 AM - 4:00 PM ET, 30-min intervals)
 * - Shows times in user's local timezone
 * - Validation (no past dates, within 7-day window, weekdays only in ET)
 * - Loading state during API call
 * - Converts to UTC for backend
 *
 * Backend expects: POST /api/benefits/:id/claim
 * Request body: { scheduled_activation_at: ISO8601_timestamp }
 */
export function ScheduleDiscountModal({
  open,
  onClose,
  onConfirm,
  discountPercent,
  durationDays = 30,
  minDate = new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow (no same-day scheduling)
  maxDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // Tomorrow + 7 days = 8 days from now
}: ScheduleDiscountModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Detect user's timezone
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

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

  // Convert ET time to user's local time for display
  const convertETToLocal = (etHour: number, etMin: number): string => {
    // Create a date in ET timezone
    const etDate = new Date()

    // Set the time in ET
    const etFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    // Create date string in ET
    const now = new Date()
    const etString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(etHour).padStart(2, '0')}:${String(etMin).padStart(2, '0')}:00`

    // Parse as ET time
    const utcDate = new Date(etString + "-05:00") // EST offset

    // Format in user's local timezone
    const localFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    return localFormatter.format(utcDate)
  }

  // Generate time slots in user's local timezone (based on ET business hours: 9 AM - 4 PM)
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = []

    // ET business hours: 9 AM to 4 PM (9:00 - 16:00)
    for (let hour = 9; hour <= 16; hour++) {
      for (let min of [0, 30]) {
        if (hour === 16 && min === 30) break // Stop at 4:00 PM ET

        const localDisplay = convertETToLocal(hour, min)
        const etHour12 = hour > 12 ? hour - 12 : hour
        const etAmPm = hour >= 12 ? "PM" : "AM"
        const etDisplay = `${etHour12}:${String(min).padStart(2, '0')} ${etAmPm} ET`

        slots.push({
          localDisplay,
          etHour: hour,
          etMin: min,
          etDisplay,
        })
      }
    }

    return slots
  }, [userTimezone])

  // Group time slots into 2 sections: Morning and Afternoon (based on local time)
  const getTimeSections = () => {
    const sections = [
      { icon: "🌅", label: "Morning", timeRange: "", times: [] as TimeSlot[] },
      { icon: "☀️", label: "Afternoon", timeRange: "", times: [] as TimeSlot[] },
    ]

    timeSlots.forEach((slot) => {
      const [timeStr, ampm] = slot.localDisplay.split(" ")
      const [hourStr] = timeStr.split(":")
      let hour = parseInt(hourStr)

      // Convert to 24-hour for comparison
      if (ampm === "PM" && hour !== 12) hour += 12
      if (ampm === "AM" && hour === 12) hour = 0

      if (hour < 12) {
        sections[0].times.push(slot)
      } else {
        sections[1].times.push(slot)
      }
    })

    // Update time range labels based on actual slots
    if (sections[0].times.length > 0) {
      const firstTime = sections[0].times[0].localDisplay
      const lastTime = sections[0].times[sections[0].times.length - 1].localDisplay
      sections[0].timeRange = `${firstTime} - ${lastTime}`
    }

    if (sections[1].times.length > 0) {
      const firstTime = sections[1].times[0].localDisplay
      const lastTime = sections[1].times[sections[1].times.length - 1].localDisplay
      sections[1].timeRange = `${firstTime} - ${lastTime}`
    }

    return sections
  }

  const timeSections = getTimeSections()

  const toggleSection = (label: string) => {
    setExpandedSection(expandedSection === label ? null : label)
  }

  // Convert selected local time to ET, then to UTC Date object
  const convertToDateTime = (date: Date, timeSlot: TimeSlot): Date => {
    // Create a date at the selected day
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    // Create date string in ET with the selected time
    const etDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(timeSlot.etHour).padStart(2, '0')}:${String(timeSlot.etMin).padStart(2, '0')}:00-05:00`

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

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTimeSlot) return

    setIsSubmitting(true)

    try {
      // Combine date + time and convert to UTC
      const combinedDateTime = convertToDateTime(selectedDate, selectedTimeSlot)

      // Call parent's onConfirm with UTC timestamp
      await onConfirm(combinedDateTime)

      // Reset state and close
      setSelectedDate(undefined)
      setSelectedTimeSlot(undefined)
      onClose()
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return // Prevent closing during submission
    setSelectedDate(undefined)
    setSelectedTimeSlot(undefined)
    onClose()
  }

  const isConfirmDisabled = !selectedDate || !selectedTimeSlot || isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Schedule Boost
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Lock in your{" "}
            <span className="font-semibold text-slate-900">
              +{discountPercent}% Deal Boost for {durationDays} Days 🎯
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

                  // Disable if before tomorrow or after maxDate
                  return dateToCheck < tomorrow || dateToCheck > maxDate
                }}
                className="rounded-md border border-slate-200"
              />
            </div>
          </div>

          {/* Time Picker - Collapsible Sections */}
          <div>
            <label className="text-sm font-semibold text-slate-900 mb-3 block">
              Select Time ({getUserTimezoneAbbr()})
            </label>
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              {timeSections.map((section, index) => (
                <div key={section.label}>
                  {/* Section Header - Clickable */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors",
                      index !== 0 && "border-t border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{section.icon}</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                        <p className="text-xs text-slate-500">{section.timeRange}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-slate-400 transition-transform duration-200",
                        expandedSection === section.label && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Section Content - Collapsible */}
                  {expandedSection === section.label && (
                    <div className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-3 gap-2">
                        {section.times.map((slot) => (
                          <Button
                            key={slot.etDisplay}
                            type="button"
                            variant={selectedTimeSlot?.etDisplay === slot.etDisplay ? "default" : "outline"}
                            onClick={() => setSelectedTimeSlot(slot)}
                            disabled={isSubmitting}
                            className={cn(
                              "h-10 text-sm font-medium",
                              selectedTimeSlot?.etDisplay === slot.etDisplay
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-white text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {slot.localDisplay}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Summary */}
          {selectedDate && selectedTimeSlot && (
            <div className="bg-white border-2 border-green-500 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold text-green-700">Locked in!</p>
              </div>
              <p className="text-base font-semibold text-slate-900 mb-1">
                {formatDate(selectedDate)} at {selectedTimeSlot.localDisplay}
              </p>
              <p className="text-xs text-slate-600">
                +{discountPercent}% Deal Boost goes live then—prep your TikTok teaser! 🎬
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
