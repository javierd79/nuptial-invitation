import * as React from "react"
import { cn } from "@/lib/utils"

export interface ColorStackProps extends React.HTMLAttributes<HTMLDivElement> {
  colors: string[]
  size?: number
  overlap?: number
}

export const ColorStack = React.forwardRef<HTMLDivElement, ColorStackProps>(
  ({ colors, size = 48, overlap = 12, className, ...props }, ref) => {
    if (!colors?.length) return null

    return (
      <div 
        ref={ref} 
        className={cn("flex flex-row items-center", className)} 
        {...props}
      >
        {colors.map((color, index) => (
          <div
            key={`${color}-${index}`}
            className="rounded-full shrink-0 shadow-sm"
            style={{
              backgroundColor: color,
              width: size,
              height: size,
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: index, 
            }}
          />
        ))}
      </div>
    )
  }
)
ColorStack.displayName = "ColorStack"