import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { COMPANY, SITE } from "@/lib/site";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

// Icons and social images come from the file convention: app/icon.png, apple-icon.png, opengraph-image.png, twitter-image.png.
export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: { default: SITE.title, template: "%s · Angelite" },
    description: SITE.description,
    applicationName: SITE.name,
    keywords: [...SITE.keywords],
    authors: [{ name: COMPANY.creator.name, url: COMPANY.creator.url }],
    creator: COMPANY.creator.name,
    publisher: COMPANY.legalName,
    category: "technology",
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        siteName: SITE.name,
        title: SITE.title,
        description: SITE.description,
        url: "/",
        locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f1ede4" },
        { media: "(prefers-color-scheme: dark)", color: "#1f1c24" },
    ],
    colorScheme: "light dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <RouteProvider>
                    <Theme>{children}</Theme>
                </RouteProvider>
            </body>
        </html>
    );
}
