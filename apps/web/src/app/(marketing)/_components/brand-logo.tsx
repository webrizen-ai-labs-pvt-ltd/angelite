import { cx } from "@/utils/cx";

/**
 * Primary lockup from the brand guidelines: the seal (Ink circle, Vellum blackletter A, Angelite halo) and the
 * UnifrakturMaguntia wordmark. Pass `inverted` on Ink grounds. Keep it at least 120 px wide.
 */
export const BrandLogo = ({ inverted, className }: { inverted?: boolean; className?: string }) => (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
        <img src="/brand/angelite-seal.png" alt="" className={cx("size-9 rounded-full", inverted && "ring-1 ring-vellum/30")} />
        <span className={cx("mkt-fraktur text-[32px] leading-none", inverted ? "text-vellum" : "text-ink")}>Angelite</span>
    </span>
);
