import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";

/** Halo mark + blackletter wordmark. Size it with a height class, e.g. `h-8`. */
export const AngeliteLogo = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className={cx("flex h-8 w-max items-center gap-2", className)}>
        <AngeliteLogoMark className="h-full" />
        {/* Wordmark is 653x187; the cream version is used in dark mode. */}
        <img src="/brand/angelite-wordmark-dark.png" alt="Angelite" className="h-[78%] w-auto dark:hidden" />
        <img src="/brand/angelite-wordmark-light.png" alt="Angelite" className="hidden h-[78%] w-auto dark:block" />
    </div>
);

export const AngeliteLogoMark = ({ className }: { className?: string }) => (
    <img src="/brand/angelite-mark.png" alt="" aria-hidden="true" className={cx("aspect-square w-auto shrink-0", className)} />
);
