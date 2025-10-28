"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/renderer/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted/60 text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-xl p-1 gap-1.5 backdrop-blur-sm shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-gradient-card data-[state=active]:text-foreground focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/70 hover:text-foreground inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-md hover:bg-muted/30 data-[state=active]:scale-[1.02] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "pc-tab",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
