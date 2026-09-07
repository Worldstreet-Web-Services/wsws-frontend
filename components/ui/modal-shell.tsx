"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloseIcon } from "@/components/ui/icons";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Identity of the current content. When it changes while the shell stays open
  // (e.g. the detail modal opening the buy sheet), the new content slides in
  // instead of swapping instantly.
  contentKey?: string | number;
  // Desktop width. Defaults to the standard sheet; "lg" gives form-heavy modals
  // (e.g. the funding flow) more room.
  size?: "md" | "lg";
  placement?: "bottom" | "center";
  panelClassName?: string;
  contentClassName?: string;
  closeButtonClassName?: string;
}

const SIZE_WIDTH: Record<"md" | "lg", string> = {
  md: "md:w-[min(440px,100%)]",
  lg: "md:w-[min(600px,100%)]",
};

export function ModalShell({
  open,
  onClose,
  children,
  contentKey,
  size = "md",
  placement = "bottom",
  panelClassName,
  contentClassName,
  closeButtonClassName,
}: ModalShellProps) {
  const reduce = useReducedMotion();
  const isCenter = placement === "center";

  return (
    // Portalled so a sheet is always measured against the viewport. Opened
    // from inside a transformed ancestor (the sidebar slides with translate-x)
    // a `fixed` overlay would otherwise be trapped inside it.
    <Portal>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className={cn(
              "fixed inset-0 z-[300] flex justify-center bg-black/62 backdrop-blur-[7px]",
              isCenter ? "items-center p-4 md:p-6" : "items-end md:items-center md:p-6"
            )}
          >
            <motion.div
              initial={
                reduce
                  ? { opacity: 0 }
                  : isCenter
                    ? { opacity: 0, scale: 0.96, y: 16 }
                    : { y: "100%" }
              }
              animate={
                reduce ? { opacity: 1 } : isCenter ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }
              }
              exit={
                reduce
                  ? { opacity: 0 }
                  : isCenter
                    ? { opacity: 0, scale: 0.96, y: 16 }
                    : { y: "100%" }
              }
              transition={
                reduce
                  ? { duration: 0.15 }
                  : { type: "spring", stiffness: 380, damping: 38, mass: 0.9 }
              }
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "bg-sheet ws-no-scrollbar relative max-h-[92vh] w-full overflow-y-auto border border-white/14 px-[26px] pt-4 pb-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_-20px_90px_-30px_rgba(0,0,0,0.9)]",
                isCenter
                  ? "w-[min(440px,100%)] rounded-[24px] pt-[26px]"
                  : "rounded-t-[24px] md:rounded-[24px] md:pt-[26px]",
                isCenter && size === "lg" ? "w-[min(600px,100%)]" : SIZE_WIDTH[size],
                panelClassName
              )}
            >
              {!isCenter && (
                <span
                  aria-hidden
                  className="mx-auto mb-4 block h-1 w-9 rounded-full bg-white/20 md:hidden"
                />
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "absolute top-[18px] right-[18px] z-[1] grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-full border border-white/12 bg-white/6 text-white/70",
                  closeButtonClassName
                )}
              >
                <CloseIcon />
              </button>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={contentKey}
                  className={contentClassName}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
