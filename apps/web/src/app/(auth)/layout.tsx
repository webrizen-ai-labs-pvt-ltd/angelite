import { ArrowLeft } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/site";
import { cx } from "@/utils/cx";
import { BrandLogo } from "../(marketing)/_components/brand-logo";
import { brandFonts } from "../fonts";
import { AuthShowcase } from "./auth-showcase";

// Signed-in and sign-in pages stay out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Sign-in and sign-up: the form on the left, a live product panel on the right (stacked below on small screens). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={cx(brandFonts, "mkt grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]")}>
            <div className="flex min-h-dvh flex-col px-5 py-6 md:px-10">
                <header className="flex items-center justify-between gap-4">
                    <Link href="/" aria-label="Angelite home">
                        <BrandLogo />
                    </Link>
                    <Link href="/" className="flex items-center gap-1.5 text-[14px] text-ink-muted transition hover:text-ink">
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Back to site
                    </Link>
                </header>

                <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-14">{children}</main>

                <footer className="flex flex-col gap-2 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © {new Date().getFullYear()} {COMPANY.legalName}
                    </p>
                    <nav className="flex gap-5" aria-label="Legal">
                        <Link href="/terms" className="hover:text-ink">
                            Terms
                        </Link>
                        <Link href="/privacy" className="hover:text-ink">
                            Privacy
                        </Link>
                        <Link href="/contact" className="hover:text-ink">
                            Help
                        </Link>
                    </nav>
                </footer>
            </div>

            <div className="p-3 lg:sticky lg:top-0 lg:h-dvh">
                <AuthShowcase />
            </div>
        </div>
    );
}
