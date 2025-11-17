"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Info } from "lucide-react";

interface FlippableCardProps {
  id: string;
  children: (params: {
    isFlipped: boolean;
    flip: () => void;
    flipBack: () => void;
  }) => React.ReactNode;
  autoFlipDelay?: number;
}

export function FlippableCard({
  id,
  children,
  autoFlipDelay = 6000,
}: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Auto-flip back after delay
  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        setIsFlipped(false);
      }, autoFlipDelay);

      return () => clearTimeout(timer);
    }
  }, [isFlipped, autoFlipDelay]);

  const flip = () => setIsFlipped(true);
  const flipBack = () => setIsFlipped(false);

  return (
    <div className="relative w-full" style={{ perspective: "1000px" }}>
      <div
        className="relative w-full transition-transform duration-600 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {children({ isFlipped, flip, flipBack })}
      </div>
    </div>
  );
}

// Helper component for the info icon button
export function FlipInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-blue-100 transition-colors"
      aria-label="More information"
    >
      <Info className="h-4 w-4 text-blue-500" />
    </button>
  );
}

// Helper component for back side wrapper
export function FlipBackSide({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute top-0 left-0 w-full h-full"
      style={{
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Helper component for front side wrapper
export function FlipFrontSide({ children }: { children: React.ReactNode }) {
  return <div style={{ backfaceVisibility: "hidden" }}>{children}</div>;
}
