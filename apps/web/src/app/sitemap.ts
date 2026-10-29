import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return PUBLIC_PAGES.map((page) => ({
        url: `${SITE.url}${page.path === "/" ? "" : page.path}`,
        lastModified,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
    }));
}
