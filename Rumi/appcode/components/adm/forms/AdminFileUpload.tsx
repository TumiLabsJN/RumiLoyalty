// components/adm/forms/AdminFileUpload.tsx
// File upload component with drag and drop support

'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, File, X } from 'lucide-react'

interface AdminFileUploadProps {
  /** Accepted file types (e.g., ".csv", ".xlsx") */
  accept?: string
  /** Label text */
  label?: string
  /** Description/help text */
  description?: string
  /** Called when file is selected */
  onFileSelect: (file: File | null) => void
  /** Currently selected file */
  selectedFile?: File | null
  /** Disabled state */
  disabled?: boolean
}

export function AdminFileUpload({
  accept = '.csv',
  label,
  description,
  onFileSelect,
  selectedFile,
  disabled = false
}: AdminFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // Validate file type if accept is specified
      if (accept) {
        const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase())
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!acceptedTypes.some(t => t === fileExt || t === file.type)) {
          return // Invalid file type
        }
      }
      onFileSelect(file)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-white mb-1">
          {label}
        </label>
      )}

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer
          transition-colors duration-200
          ${disabled
            ? 'border-white/10 bg-white/5 cursor-not-allowed opacity-50'
            : isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : selectedFile
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedFile ? (
          // File selected state
          <div className="flex items-center justify-center gap-3">
            <File className="size-8 text-green-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-white">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          // Empty state
          <>
            <Upload className="mx-auto size-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-400">
              Drag and drop file here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              or click to browse
            </p>
          </>
        )}
      </div>

      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}
