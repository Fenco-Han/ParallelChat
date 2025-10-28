import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/renderer/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.25rem] w-9 shrink-0 items-center rounded-full border border-transparent shadow-md transition-all duration-300 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-lg",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 shadow-sm transition-all duration-300 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
