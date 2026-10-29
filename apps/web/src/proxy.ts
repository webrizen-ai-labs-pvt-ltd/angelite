import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const APP_PATHS = ["/studio", "/voices", "/history", "/lab"];
const AUTH_PATHS = ["/sign-in", "/sign-up"];

const matches = (pathname: string, paths: string[]) => paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });

    // Refreshes the session cookie if needed. Must run before any redirect decision.
    const { data } = await supabase.auth.getClaims();
    const isSignedIn = Boolean(data?.claims?.sub);
    const { pathname } = request.nextUrl;

    if (!isSignedIn && matches(pathname, APP_PATHS)) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        url.search = `?next=${encodeURIComponent(pathname)}`;
        return NextResponse.redirect(url);
    }

    if (isSignedIn && matches(pathname, AUTH_PATHS)) {
        const url = request.nextUrl.clone();
        url.pathname = "/studio";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    // Skip static files (images, voice samples, the in-browser engine, SEO files): they never need a session.
    matcher: [
        "/((?!_next/static|_next/image|api/|brand/|voice-previews/|pocket-tts/|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|svg|ico|webp|mp3|js|txt|xml)$).*)",
    ],
};
