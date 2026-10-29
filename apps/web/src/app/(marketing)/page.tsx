import { COMPANY, SITE } from "@/lib/site";
import { getCurrentUser } from "@/lib/supabase/server";
import { Bento } from "./_components/bento";
import { CtaCard } from "./_components/cta-card";
import { Divider } from "./_components/frame";
import { Hero } from "./_components/hero";
import { OpenSourceBand } from "./_components/open-source-band";
import { Statement } from "./_components/statement";
import { Steps } from "./_components/steps";
import { StudioShowcase } from "./_components/studio-showcase";
import { VoiceGrid } from "./_components/voice-grid";

// Structured data for search engines: the product, the company behind it and its creator.
const STRUCTURED_DATA = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": `${COMPANY.url}#organization`,
            name: COMPANY.legalName,
            alternateName: COMPANY.shortName,
            url: COMPANY.url,
            founder: { "@type": "Person", name: COMPANY.creator.name, url: COMPANY.creator.url },
        },
        {
            "@type": "SoftwareApplication",
            name: SITE.name,
            url: SITE.url,
            description: SITE.description,
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web browser",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@id": `${COMPANY.url}#organization` },
            creator: { "@type": "Person", name: COMPANY.creator.name, url: COMPANY.creator.url },
        },
    ],
};

export default async function HomePage() {
    const signedIn = Boolean(await getCurrentUser());

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }} />
            <Hero signedIn={signedIn} />
            <Divider wave />
            <Statement />
            <Divider />
            <Bento signedIn={signedIn} />
            <Divider />
            <VoiceGrid />
            <Divider wave />
            <StudioShowcase signedIn={signedIn} />
            <Divider />
            <Steps />
            <Divider />
            <OpenSourceBand />
            <Divider wave />
            <CtaCard signedIn={signedIn} />
        </>
    );
}
