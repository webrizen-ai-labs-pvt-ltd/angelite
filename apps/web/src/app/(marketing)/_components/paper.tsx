import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

// Layout for the secondary pages: each section is a Vellum card with its heading and notes on the left and
// content on the right.

export const Page = ({ children }: { children: ReactNode }) => (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-3 pb-16 md:px-4 md:pb-24">{children}</div>
);

export const Section = ({
    id,
    number,
    title,
    notes,
    children,
    className,
}: {
    id?: string;
    number: string;
    title: string;
    notes?: ReactNode;
    children: ReactNode;
    className?: string;
}) => (
    <section id={id} className={cx("grid scroll-mt-24 gap-x-12 gap-y-8 rounded-[28px] bg-vellum-card p-6 md:grid-cols-12 md:p-10", className)}>
        <div className="flex flex-col gap-6 md:col-span-4">
            <div className="flex flex-col gap-2">
                <span className="mkt-data text-[12px] text-deep-angelite">{number.padStart(2, "0")}</span>
                <h2 className="mkt-heading text-[28px] text-ink md:text-[32px]">{title}</h2>
            </div>
            {notes && <div className="hidden flex-col gap-4 md:flex">{notes}</div>}
        </div>
        <div className="flex min-w-0 flex-col gap-8 md:col-span-8">{children}</div>
    </section>
);

/** A highlighted figure with its label. */
export const Note = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col gap-1 rounded-2xl bg-vellum px-4 py-3.5">
        <span className="mkt-display text-[30px] leading-none text-ink">{value}</span>
        <span className="text-[13px] leading-snug text-ink-muted">{label}</span>
    </div>
);

export const Prose = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cx("mkt-prose flex flex-col gap-5 text-[17px]", className)}>{children}</div>
);
