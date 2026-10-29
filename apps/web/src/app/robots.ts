import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Signed-in pages and APIs have nothing for search engines; everything else is public.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/voices", "/history", "/lab", "/api/", "/auth/"] },
        sitemap: `${SITE.url}/sitemap.xml`,
        host: SITE.url,
    };
}
