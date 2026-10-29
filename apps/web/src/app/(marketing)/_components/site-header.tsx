"use client";

import { useEffect, useState } from "react";
import { Menu02, XClose } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/utils/cx";
import { BrandLogo } from "./brand-logo";

export const NAV = [
    { label: "Voices", href: "/#voices" },
    { label: "Studio", href: "/#studio" },
    { label: "Open source", href: "/open-source" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
];

export const SiteHeader = ({ signedIn }: { signedIn: boolean }) => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => setIsOpen(false), [pathname]);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={cx("fixed inset-x-0 top-0 z-50 transition-colors duration-200", scrolled || isOpen ? "bg-vellum/90 backdrop-blur-md" : "bg-transparent")}
        >
            <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between gap-6 px-5 md:px-8">
                <Link href="/" aria-label="Angelite home">
                    <BrandLogo />
                </Link>

                <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
                    {NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={pathname === item.href ? "page" : undefined}
                            className={cx("text-[15px] text-ink-muted transition hover:text-ink", pathname === item.href && "font-medium text-ink")}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden items-center gap-5 lg:flex">
                    {!signedIn && (
                        <Link href="/sign-in" className="text-[15px] text-ink-muted transition hover:text-ink">
                            Sign in
                        </Link>
                    )}
                    <Link
                        href={signedIn ? "/studio" : "/sign-up"}
                        className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-vellum transition hover:bg-ink-soft"
                    >
                        {signedIn ? "Open Studio" : "Start for free"}
                    </Link>
                </div>

                <button
                    type="button"
                    className="-mr-2 rounded-full p-2 text-ink lg:hidden"
                    aria-expanded={isOpen}
                    aria-controls="mobile-nav"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    {isOpen ? <XClose className="size-6" aria-hidden="true" /> : <Menu02 className="size-6" aria-hidden="true" />}
                </button>
            </div>

            {isOpen && (
                <nav id="mobile-nav" className="flex flex-col gap-1 px-5 pt-2 pb-6 lg:hidden" aria-label="Main">
                    {NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="rounded-2xl px-3 py-3 text-lg text-ink hover:bg-vellum-card"
                            onClick={() => setIsOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link href={signedIn ? "/studio" : "/sign-up"} className="mt-3 rounded-full bg-ink px-5 py-3.5 text-center font-medium text-vellum">
                        {signedIn ? "Open Studio" : "Start for free"}
                    </Link>
                    {!signedIn && (
                        <Link href="/sign-in" className="py-3 text-center text-ink-muted">
                            Sign in
                        </Link>
                    )}
                </nav>
            )}
        </header>
    );
};
