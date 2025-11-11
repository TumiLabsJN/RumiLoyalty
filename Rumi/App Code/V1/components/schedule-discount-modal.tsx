"use client"

import { useState } from "react"
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
  timezone?: string
  timeRange?: { start: string; end: string }
}

/**
 * REUSABLE DISCOUNT SCHEDULING MODAL
 *
 * Used across Home, Rewards, and Missions pages when claiming discount benefits.
 *
 * Features:
 * - Date picker (today through +7 days)
 * - Time picker grid (10:00 AM - 6:30 PM ET, 30-min intervals)
 * - Timezone indicator (Eastern Time)
 * - Validation (no past dates, within 7-day window)
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
  timezone = "America/New_York", // Eastern Time (ET)
  timeRange = { start: "10:00", end: "18:30" }, // 10 AM - 6:30 PM
}: ScheduleDiscountModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Generate time slots (30-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = []
    const [startHour, startMin] = timeRange.start.split(":").map(Number)
    const [endHour, endMin] = timeRange.end.split(":").map(Number)

    let currentHour = startHour
    let currentMin = startMin

    const endTotalMin = endHour * 60 + endMin

    while (currentHour * 60 + currentMin <= endTotalMin) {
      const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour
      const ampm = currentHour < 12 ? "AM" : "PM"
      const minStr = currentMin.toString().padStart(2, "0")
      slots.push(`${hour12}:${minStr} ${ampm}`)

      // Add 30 minutes
      currentMin += 30
      if (currentMin >= 60) {
        currentMin = 0
        currentHour += 1
      }
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  // Group time slots into 2 sections: Morning (9:00-11:30) and Afternoon (12:00-5:00)
  const getTimeSections = () => {
    const sections = [
      { icon: "🌅", label: "Morning", timeRange: "9:00 AM - 11:30 AM", times: [] as string[] },
      { icon: "☀️", label: "Afternoon", timeRange: "12:00 PM - 5:00 PM", times: [] as string[] },
    ]

    timeSlots.forEach((time) => {
      const [timeStr, ampm] = time.split(" ")
      const [hourStr] = timeStr.split(":")
      let hour = parseInt(hourStr)

      // Convert to 24-hour for comparison
      if (ampm === "PM" && hour !== 12) hour += 12
      if (ampm === "AM" && hour === 12) hour = 0

      if (hour < 12) {
        sections[0].times.push(time) // Morning: 9:00 AM - 11:30 AM
      } else {
        sections[1].times.push(time) // Afternoon: 12:00 PM - 5:00 PM (includes up to 6:30 PM from backend)
      }
    })

    return sections
  }

  const timeSections = getTimeSections()

  const toggleSection = (label: string) => {
    setExpandedSection(expandedSection === label ? null : label)
  }

  // Convert 12-hour time string to Date object
  const convertToDateTime = (date: Date, timeStr: string): Date => {
    const [time, ampm] = timeStr.split(" ")
    const [hourStr, minStr] = time.split(":")
    let hour = parseInt(hourStr)
    const min = parseInt(minStr)

    // Convert to 24-hour format
    if (ampm === "PM" && hour !== 12) hour += 12
    if (ampm === "AM" && hour === 12) hour = 0

    const combined = new Date(date)
    combined.setHours(hour, min, 0, 0)
    return combined
  }

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Get timezone abbreviation (EST/EDT)
  const getTimezoneAbbr = (): string => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
    const parts = formatter.formatToParts(now)
    const tzPart = parts.find((part) => part.type === "timeZoneName")
    return tzPart?.value || "ET"
  }

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return

    setIsSubmitting(true)

    try {
      // Combine date + time and convert to UTC
      const combinedDateTime = convertToDateTime(selectedDate, selectedTime)

      // Call parent's onConfirm with UTC timestamp
      await onConfirm(combinedDateTime)

      // Reset state and close
      setSelectedDate(undefined)
      setSelectedTime(undefined)
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
    setSelectedTime(undefined)
    onClose()
  }

  const isConfirmDisabled = !selectedDate || !selectedTime || isSubmitting

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
            <br />
            <span className="text-xs text-slate-500 mt-1 inline-block">
              Schedule starts tomorrow (no same-day activation)
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

                  // Disable if before tomorrow (no same-day scheduling) or after maxDate
                  return dateToCheck < tomorrow || dateToCheck > maxDate
                }}
                className="rounded-md border border-slate-200"
              />
            </div>
          </div>

          {/* Time Picker - Collapsible Sections */}
          <div>
            <label className="text-sm font-semibold text-slate-900 mb-3 block">
              Select Time ({getTimezoneAbbr()})
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
                        {section.times.map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant={selectedTime === time ? "default" : "outline"}
                            onClick={() => setSelectedTime(time)}
                            disabled={isSubmitting}
                            className={cn(
                              "h-10 text-sm font-medium",
                              selectedTime === time
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-white text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Timezone Info */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900">
              Times shown in <span className="font-semibold">Eastern Time ({getTimezoneAbbr()})</span>.
              Your discount will be activated by the admin team at the selected time.
            </p>
          </div>

          {/* Selected Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-white border-2 border-green-500 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold text-green-700">Locked in!</p>
              </div>
              <p className="text-base font-semibold text-slate-900 mb-1">
                {formatDate(selectedDate)} at {selectedTime} {getTimezoneAbbr()}
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
