import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const createClient = async () => {
    const cookieStore = await cookies();

    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // Called from a Server Component, where cookies are read-only. The proxy refreshes sessions instead.
                }
            },
        },
    });
};

/** Returns the signed-in user's id and email, verified via the JWT signature, or null. */
export const getCurrentUser = async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;

    return { id: claims.sub, email: (claims.email as string | undefined) ?? "" };
};

/** Bypasses RLS. Server-only, for scheduled jobs such as history cleanup. */
export const createAdminClient = () =>
    createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
