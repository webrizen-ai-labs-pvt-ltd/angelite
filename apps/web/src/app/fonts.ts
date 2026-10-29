import { IBM_Plex_Mono, IBM_Plex_Sans, UnifrakturMaguntia } from "next/font/google";
import { cx } from "@/utils/cx";

// Brand typefaces (brand/guidelines.pdf, section 05), shared by the public site and the sign-in pages.
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-plex-mono" });
const unifraktur = UnifrakturMaguntia({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-unifraktur" });

export const brandFonts = cx(plexSans.variable, plexMono.variable, unifraktur.variable);
