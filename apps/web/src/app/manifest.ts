import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE.title,
        short_name: SITE.name,
        description: SITE.description,
        start_url: "/studio",
        display: "standalone",
        background_color: "#f1ede4",
        theme_color: "#1f1c24",
        icons: [
            { src: "/icon.png", sizes: "256x256", type: "image/png" },
            { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
        ],
    };
}
