import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gaugeVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-16 w-16 text-xs",
        default: "h-24 w-24 text-sm",
        lg: "h-32 w-32 text-base",
        xl: "h-48 w-48 text-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface GaugeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gaugeVariants> {
  value: number
  showValue?: boolean
  color?: string
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

const Gauge = React.forwardRef<HTMLDivElement, GaugeProps>(
  ({ className, value, size, showValue = true, color = "#10b981", ...props }, ref) => {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const progress = Math.min(100, Math.max(0, value || 0))
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
      <div className={cn("relative inline-flex items-center justify-center", className)} ref={ref} {...props}>
        <svg
          className="transform -rotate-90"
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="text-gray-200 dark:text-gray-800"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
          <circle
            className="transition-all duration-300 ease-in-out"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            fill="transparent"
            r={radius}
            cx="50"
            cy="50"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
    )
  }
)
Gauge.displayName = "Gauge"

export { Gauge, gaugeVariants }
