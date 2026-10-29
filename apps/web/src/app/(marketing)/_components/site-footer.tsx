import Link from "next/link";
import { COMPANY } from "@/lib/site";
import { BrandLogo } from "./brand-logo";

const COLUMNS = [
    {
        title: "Product",
        links: [
            { label: "Studio", href: "/studio" },
            { label: "Voices", href: "/#voices" },
            { label: "Pricing", href: "/pricing" },
            { label: "Open source", href: "/open-source" },
        ],
    },
    {
        title: "Company",
        links: [
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
            { label: COMPANY.domain, href: COMPANY.url, external: true },
            { label: COMPANY.creator.domain, href: COMPANY.creator.url, external: true },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Terms of use", href: "/terms" },
            { label: "Privacy", href: "/privacy" },
        ],
    },
];

export const SiteFooter = () => (
    <footer className="px-3 pb-3 md:px-4 md:pb-4">
        <div className="mx-auto max-w-[1240px] rounded-[28px] bg-vellum-card px-6 pt-14 pb-6 md:px-12">
            <div className="grid gap-12 md:grid-cols-[1.6fr_repeat(3,1fr)]">
                <div className="flex max-w-xs flex-col gap-4">
                    <BrandLogo />
                    <p className="text-[15px] leading-relaxed text-ink-muted">
                        Open-source AI voice generation. Release 1 of the open-source program at {COMPANY.shortName}.
                    </p>
                    <p className="text-[14px] text-ink-muted">
                        Created by{" "}
                        <a href={COMPANY.creator.url} target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-4">
                            {COMPANY.creator.name}
                        </a>
                    </p>
                </div>
                {COLUMNS.map((column) => (
                    <div key={column.title} className="flex flex-col gap-4">
                        <p className="text-[15px] font-medium text-ink">{column.title}</p>
                        <ul className="flex flex-col gap-3">
                            {column.links.map((link) => (
                                <li key={link.href}>
                                    {"external" in link ? (
                                        <a href={link.href} target="_blank" rel="noreferrer" className="text-[15px] text-ink-muted transition hover:text-ink">
                                            {link.label}
                                        </a>
                                    ) : (
                                        <Link href={link.href} className="text-[15px] text-ink-muted transition hover:text-ink">
                                            {link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="mt-14 flex flex-col gap-2 rounded-2xl bg-vellum px-5 py-4 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
                <p>
                    © {new Date().getFullYear()} {COMPANY.legalName}
                </p>
                <p>Clone only voices you have permission to use.</p>
            </div>
        </div>
    </footer>
);
