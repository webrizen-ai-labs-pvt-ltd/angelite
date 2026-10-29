import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

// Target of the link in Supabase confirmation emails. Supports both the token-hash and PKCE code flows.
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const next = safeNextPath(searchParams.get("next"));
    const supabase = await createClient();

    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;

    const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : tokenHash && type
          ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
          : { error: new Error("Missing confirmation token") };

    const url = request.nextUrl.clone();
    url.search = "";
    if (error) {
        url.pathname = "/sign-in";
        url.searchParams.set("error", "That confirmation link is invalid or has expired.");
    } else {
        url.pathname = next;
    }
    return NextResponse.redirect(url);
}
