import type { FC } from "react";
import { ArrowRight, BookOpen01, ChevronDown, FolderClosed, PauseCircle, Stars02, VolumeMax } from "@untitledui/icons";
import Link from "next/link";
import { cx } from "@/utils/cx";

// The Studio, drawn as it really looks (script toolbar, pause marks, effect and expressiveness), with callouts for
// the features that make it more than a text box.

const CALLOUTS: { icon: FC<{ className?: string }>; title: string; body: string; position: string }[] = [
    { icon: PauseCircle, title: "Pauses", body: "Drop [pause 1s] anywhere for a beat of silence, up to five seconds.", position: "lg:top-16 lg:left-0" },
    {
        icon: VolumeMax,
        title: "Pronunciations",
        body: "Teach names and brands how they sound once, and every voice says them right.",
        position: "lg:bottom-0 lg:left-4",
    },
    { icon: Stars02, title: "Effects", body: "Room, hall, echo, telephone or radio, applied as the voice is made.", position: "lg:top-28 lg:right-0" },
    {
        icon: FolderClosed,
        title: "Saves to your folder",
        body: "On-device clips land as WAV files in a folder you choose.",
        position: "lg:right-8 lg:bottom-16",
    },
];

const Callout = ({ icon: Icon, title, body, className }: { icon: FC<{ className?: string }>; title: string; body: string; className?: string }) => (
    <div
        className={cx(
            "flex max-w-[300px] gap-3.5 rounded-[20px] bg-vellum-card/95 p-4 shadow-[0_18px_40px_-24px_rgba(31,28,36,0.4)] ring-1 ring-ink/8 backdrop-blur",
            className,
        )}
    >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-angelite/25 text-deep-angelite">
            <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-ink">{title}</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">{body}</p>
        </div>
    </div>
);

const StudioMock = () => (
    <div
        className="w-full max-w-[560px] overflow-hidden rounded-[22px] bg-vellum-card text-left shadow-[0_40px_80px_-40px_rgba(31,28,36,0.55)] ring-1 ring-ink/10"
        aria-hidden="true"
    >
        <div className="flex items-center gap-1.5 border-b border-ink/8 px-3 py-2 text-[13px] text-ink-muted">
            <span className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                <PauseCircle className="size-4" /> Pause <ChevronDown className="size-3.5" />
            </span>
            <span className="flex items-center gap-1.5 rounded-lg px-2 py-1.5">
                <VolumeMax className="size-4" /> Pronunciations (2)
            </span>
            <span className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 sm:flex">
                <BookOpen01 className="size-4" /> Examples <ChevronDown className="size-3.5" />
            </span>
        </div>
        <div className="px-5 py-5 text-[17px] leading-[1.8] text-ink">
            The city was quiet that night. <span className="mkt-data rounded-md bg-angelite/30 px-1.5 py-0.5 text-[13px] text-deep-angelite">[pause 1s]</span>{" "}
            Too quiet. <span className="mkt-data rounded-md bg-angelite/30 px-1.5 py-0.5 text-[13px] text-deep-angelite">[pause 0.5s]</span> Somewhere in the
            distance, a door slammed shut, and every light on the street went out at once.
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-5 py-3 text-[13px] text-ink-muted">
            <span className="mkt-data text-[12px]">137 / 1,000 characters, 26 words, 2 pauses, ~12 s</span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-ink/8 bg-vellum px-5 py-4 text-[13px]">
            <div className="flex flex-col gap-1.5">
                <span className="text-ink-muted">Effect</span>
                <span className="flex items-center justify-between rounded-xl bg-vellum-card px-3 py-2 text-ink ring-1 ring-ink/10">
                    Hall <ChevronDown className="size-4 text-ink-muted" />
                </span>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-ink-muted">Expressiveness</span>
                <span className="flex h-9 items-center">
                    <span className="relative h-1.5 w-full rounded-full bg-ink/10">
                        <span className="absolute inset-y-0 left-0 w-[35%] rounded-full bg-ink" />
                        <span className="absolute top-1/2 left-[35%] size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vellum-card ring-2 ring-ink" />
                    </span>
                </span>
            </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-[13px] text-ink-muted">My voice, on this device</span>
            <span className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-vellum">Generate on this device</span>
        </div>
    </div>
);

export const StudioShowcase = ({ signedIn }: { signedIn: boolean }) => (
    <section id="studio" className="scroll-mt-24 px-3 py-16 md:px-4 md:py-24">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-vellum-card/60 px-4 py-16 ring-1 ring-ink/6 md:px-10 md:py-20">
            {/* Concentric rings, like sound spreading from the centre. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    background:
                        "repeating-radial-gradient(circle at 50% 62%, transparent 0 58px, rgba(31,28,36,0.05) 59px 60px), radial-gradient(circle at 50% 62%, #f8f6f1 0%, transparent 60%)",
                }}
            />
            <div className="relative mx-auto max-w-2xl text-center">
                <h2 className="mkt-heading text-[clamp(2rem,4.4vw,3.25rem)] text-ink">A studio built for scripts</h2>
                <p className="mt-4 text-[18px] leading-relaxed text-ink-muted">
                    Write the way you speak. Mark pauses, fix tricky names and choose the room it&rsquo;s spoken in, then download MP3, Opus or WAV.
                </p>
                <Link
                    href={signedIn ? "/studio" : "/sign-up"}
                    className="mt-8 inline-flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-[15px] font-medium text-vellum transition hover:bg-ink-soft"
                >
                    Open the Studio
                    <span className="flex size-8 items-center justify-center rounded-full bg-vellum text-ink">
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                </Link>
            </div>

            <div className="relative mt-14 lg:min-h-[560px]">
                <div className="flex justify-center lg:absolute lg:inset-x-0 lg:top-4">
                    <StudioMock />
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:block">
                    {CALLOUTS.map((callout) => (
                        <Callout key={callout.title} {...callout} className={cx("lg:absolute", callout.position)} />
                    ))}
                </div>
            </div>
        </div>
    </section>
);
