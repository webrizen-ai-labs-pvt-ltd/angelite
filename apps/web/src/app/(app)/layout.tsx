import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { charactersUsedThisMonth } from "@/lib/usage";
import { AppShell } from "./app-shell";

// Signed-in and sign-in pages stay out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const supabase = await createClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, plan, monthly_character_limit, characters_used, usage_period_start")
        .eq("id", user.id)
        .single();

    return (
        <AppShell
            email={user.email}
            displayName={profile?.display_name ?? null}
            isPro={profile?.plan === "pro"}
            charactersUsed={profile ? charactersUsedThisMonth(profile) : 0}
            characterLimit={profile?.monthly_character_limit ?? 10000}
        >
            {children}
        </AppShell>
    );
}
