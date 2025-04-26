"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export type SocialMediaInstance = "facebook" | "instagram" | "tiktok" | "linkedin" | "youtube"

export interface SocialMediaSwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  activeInstance: SocialMediaInstance
  onInstanceChange: (instance: SocialMediaInstance) => void
}

export const socialMediaConfig = {
  instagram: {
    name: "Instagram",
    icon: "/logos/instagram.svg",
    color: "#E4405F",
    hoverColor: "#d62d55"
  },
  facebook: {
    name: "Facebook",
    icon: "/logos/facebook.svg",
    color: "#1877F2",
    hoverColor: "#0d6efd"
  },
  tiktok: {
    name: "TikTok",
    icon: "/logos/tiktok.svg",
    color: "#000000",
    hoverColor: "#333333"
  },
  linkedin: {
    name: "LinkedIn",
    icon: "/logos/linkedin.svg",
    color: "#0A66C2",
    hoverColor: "#0953a0"
  },
  youtube: {
    name: "YouTube",
    icon: "/logos/youtube.svg",
    color: "#FF0000",
    hoverColor: "#cc0000"
  }
}

export function SocialMediaSwitch({
  activeInstance,
  onInstanceChange,
  className,
  ...props
}: SocialMediaSwitchProps) {
  return (
    <div className={cn("relative inline-flex rounded-full p-1 bg-gray-100 border border-gray-200", className)} {...props}>
      {Object.entries(socialMediaConfig).map(([key, config]) => {
        const instance = key as SocialMediaInstance
        const isActive = activeInstance === instance
        
        return (
          <button
            key={instance}
            onClick={() => onInstanceChange(instance)}
            className={cn(
              "relative z-10 rounded-full p-1.5 flex items-center justify-center transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              isActive ? "text-white" : "text-gray-600 hover:text-gray-900"
            )}
            style={{ 
              width: "32px", 
              height: "32px",
            }}
            aria-label={`Switch to ${config.name}`}
            title={config.name}
          >
            <img 
              src={config.icon} 
              alt={config.name} 
              className={cn("w-5 h-5", isActive && "brightness-0 invert")} 
            />
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r -z-10"
                style={{ 
                  backgroundImage: `linear-gradient(to right, ${config.color}, ${config.hoverColor})`,
                }}
                layoutId="socialMediaSwitchBackground"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
} 