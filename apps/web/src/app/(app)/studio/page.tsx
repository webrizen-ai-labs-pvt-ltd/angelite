import { ClockRewind, MessageChatSquare, PauseCircle, Stars02, UserSquare, VolumeMax } from "@untitledui/icons";
import type { Metadata } from "next";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { isCloningEnabled } from "@/lib/inference";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { charactersUsedThisMonth } from "@/lib/usage";
import { type ClonedVoice, PRESET_VOICES } from "@/lib/voices";
import { StudioForm } from "./studio-form";

export const metadata: Metadata = { title: "Studio" };

const VOICE_LIMIT = 3;

const TIPS = [
    { icon: PauseCircle, title: "Add a beat of silence", body: "Type [pause 1s] anywhere, or use the Pause menu above the text." },
    { icon: VolumeMax, title: "Fix a tricky name", body: "Pronunciations teach every voice how to say names and brands." },
    { icon: Stars02, title: "Unlimited on your device", body: "Cloned voices run in your browser and don't use your monthly characters." },
];

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ voice?: string }> }) {
    const { voice } = await searchParams;
    const supabase = await createClient();
    const user = await getCurrentUser();
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

    // Row-level security limits every query to the signed-in user's own rows.
    const [{ data: voices }, { data: profile }, { data: recent }, { count: generatedThisMonth }] = await Promise.all([
        supabase.from("voices").select("id, name, model, language, sample_path, created_at").order("created_at", { ascending: false }).returns<ClonedVoice[]>(),
        supabase.from("profiles").select("display_name, plan, monthly_character_limit, characters_used, usage_period_start").maybeSingle(),
        supabase.from("generations").select("id, text, voice_name, format, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("generations").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    ]);

    const isPro = profile?.plan === "pro";
    const name = profile?.display_name || user?.email.split("@")[0] || "there";
    const used = profile ? charactersUsedThisMonth(profile) : 0;
    const limit = profile?.monthly_character_limit ?? 10000;
    const cloned = voices?.length ?? 0;

    const stats = [
        { label: "Server characters this month", value: used.toLocaleString(), detail: isPro ? "Unlimited on Pro" : `of ${limit.toLocaleString()}` },
        { label: "Generated this month", value: String(generatedThisMonth ?? 0), detail: "on our servers" },
        { label: "Cloned voices", value: String(cloned), detail: isPro ? "Unlimited on Pro" : `of ${VOICE_LIMIT}` },
        { label: "Voices available", value: String(PRESET_VOICES.length + cloned), detail: `${PRESET_VOICES.length} presets + yours` },
    ];

    return (
        <div className="mx-auto flex max-w-container flex-col gap-8 px-4 lg:px-8">
            <div className="flex flex-col gap-4 border-b border-secondary pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-display-xs font-semibold text-primary">Welcome back, {name}</h1>
                        {isPro && (
                            <Badge size="sm" color="brand">
                                Pro
                            </Badge>
                        )}
                    </div>
                    <p className="text-md text-tertiary">Write a script, choose a voice, and turn it into speech.</p>
                </div>
                <div className="flex gap-3">
                    <Button color="secondary" size="md" href="/voices" iconLeading={<UserSquare data-icon aria-hidden="true" />}>
                        Clone a voice
                    </Button>
                    <Button color="secondary" size="md" href="/history" iconLeading={<ClockRewind data-icon aria-hidden="true" />}>
                        History
                    </Button>
                </div>
            </div>

            <dl className="grid grid-cols-2 overflow-hidden rounded-xl ring-1 ring-secondary ring-inset lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <div
                        key={stat.label}
                        className={[
                            "flex flex-col gap-1 p-4 md:p-5",
                            index % 2 === 1 ? "border-l border-secondary" : "",
                            index >= 2 ? "border-t border-secondary lg:border-t-0" : "",
                            index === 2 ? "lg:border-l" : "",
                        ].join(" ")}
                    >
                        <dt className="text-sm text-tertiary">{stat.label}</dt>
                        <dd className="text-display-xs font-semibold text-primary">{stat.value}</dd>
                        <dd className="text-xs text-quaternary">{stat.detail}</dd>
                    </div>
                ))}
            </dl>

            <StudioForm clonedVoices={voices ?? []} initialVoice={voice} serverCloning={isCloningEnabled()} isPro={isPro} />

            <div className="grid gap-6 border-t border-secondary pt-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-primary">Recent from the server</h2>
                        <Button color="link-color" size="sm" href="/history">
                            View all
                        </Button>
                    </div>
                    {recent?.length ? (
                        <ul className="flex flex-col divide-y divide-secondary rounded-xl ring-1 ring-secondary ring-inset">
                            {recent.map((item) => (
                                <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-primary">{item.text}</p>
                                        <p className="text-xs text-tertiary">
                                            {item.voice_name}, {dateFormat.format(new Date(item.created_at))}
                                        </p>
                                    </div>
                                    <Badge size="sm" color="gray">
                                        {item.format.toUpperCase()}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-xl px-4 py-6 text-sm text-tertiary ring-1 ring-secondary ring-inset">
                            Nothing yet. Clips you make with preset voices appear here; on-device clips are in History.
                        </p>
                    )}
                </section>

                <section className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-primary">Tips</h2>
                    <ul className="flex flex-col gap-3">
                        {TIPS.map((tip) => (
                            <li key={tip.title} className="flex gap-3 rounded-xl p-4 ring-1 ring-secondary ring-inset">
                                <FeaturedIcon icon={tip.icon} color="brand" theme="light" size="sm" />
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold text-primary">{tip.title}</p>
                                    <p className="text-sm text-tertiary">{tip.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Button color="link-gray" size="sm" href="/contact" iconLeading={<MessageChatSquare data-icon aria-hidden="true" />} className="self-start">
                        Questions or feedback? Contact us
                    </Button>
                </section>
            </div>
        </div>
    );
}
