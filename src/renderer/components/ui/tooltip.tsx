'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';
import { Z_INDEX } from '@/lib/z-index';

const TooltipCreateHandle = TooltipPrimitive.createHandle;

function TooltipProvider({
  delay = 80,
  closeDelay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider closeDelay={closeDelay} delay={delay} {...props} />;
}

const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger({ delay = 80, closeDelay = 0, ...props }: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      closeDelay={closeDelay}
      data-slot="tooltip-trigger"
      delay={delay}
      {...props}
    />
  );
}

function TooltipPopup({
  className,
  align = 'center',
  sideOffset = 4,
  side = 'top',
  zIndex,
  children,
  ...props
}: TooltipPrimitive.Popup.Props & {
  align?: TooltipPrimitive.Positioner.Props['align'];
  side?: TooltipPrimitive.Positioner.Props['side'];
  sideOffset?: TooltipPrimitive.Positioner.Props['sideOffset'];
  zIndex?: number;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        className="h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] data-instant:transition-none"
        style={{ zIndex: zIndex ?? Z_INDEX.TOOLTIP }}
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            'relative flex h-(--popup-height,auto) w-(--popup-width,auto) origin-(--transform-origin) text-balance rounded-md border bg-popover bg-clip-padding text-popover-foreground text-xs shadow-black/5 shadow-md transition-[scale,opacity] duration-[var(--tt-in-dur)] data-ending-style:duration-[var(--tt-out-dur)] ease-out before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-[var(--tt-scale)] data-starting-style:scale-[var(--tt-scale)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-instant:duration-0 motion-reduce:transition-none dark:bg-clip-border dark:before:shadow-[0_-1px_--theme(--color-white/8%)]',
            className
          )}
          data-slot="tooltip-popup"
          {...props}
        >
          <TooltipPrimitive.Viewport
            className="relative size-full overflow-clip px-(--viewport-inline-padding) py-1 [--viewport-inline-padding:--spacing(2)] data-instant:transition-none **:data-current:data-ending-style:opacity-0 **:data-current:data-starting-style:opacity-0 **:data-previous:data-ending-style:opacity-0 **:data-previous:data-starting-style:opacity-0 **:data-current:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-previous:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-previous:truncate **:data-current:opacity-100 **:data-previous:opacity-100 **:data-current:transition-opacity **:data-previous:transition-opacity"
            data-slot="tooltip-viewport"
          >
            {children}
          </TooltipPrimitive.Viewport>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipPopup as TooltipContent,
  TooltipProvider,
  TooltipTrigger,
};
