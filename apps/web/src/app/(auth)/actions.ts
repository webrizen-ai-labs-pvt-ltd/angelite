"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

// Network failures surface as a bare "fetch failed"; give users something actionable instead.
const describe = (error: { message: string; name?: string }) =>
    error.name === "AuthRetryableFetchError" || error.message === "fetch failed"
        ? "Can't reach the sign-in service right now. Please try again."
        : error.message;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return { error: "Enter your email and password." };

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: describe(error) };

    redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || password.length < 8) return { error: "Enter your email and a password of at least 8 characters." };

    const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: name || null },
            emailRedirectTo: `${origin}/auth/confirm?next=/studio`,
        },
    });
    if (error) return { error: describe(error) };

    // With email confirmation turned off in Supabase, the user is signed in immediately.
    if (data.session) redirect("/studio");

    return { message: `We sent a confirmation link to ${email}. Open it to finish signing up.` };
}
