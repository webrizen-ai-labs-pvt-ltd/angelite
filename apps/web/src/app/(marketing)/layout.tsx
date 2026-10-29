import { getCurrentUser } from "@/lib/supabase/server";
import { cx } from "@/utils/cx";
import { brandFonts } from "../fonts";
import { AmbientBackground, FrameLines } from "./_components/frame";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { SmoothScroll } from "./_components/smooth-scroll";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();

    return (
        <div className={cx(brandFonts, "mkt relative isolate min-h-dvh")}>
            <SmoothScroll />
            <AmbientBackground />
            <FrameLines />
            <SiteHeader signedIn={Boolean(user)} />
            <main className="relative z-[2]">{children}</main>
            <div className="relative z-[2]">
                <SiteFooter />
            </div>
        </div>
    );
}
