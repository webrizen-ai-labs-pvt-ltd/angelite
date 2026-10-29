"use client";

import { useActionState } from "react";
import { CheckCircle } from "@untitledui/icons";
import { type ContactState, sendMessage } from "./actions";
import { TOPICS } from "./topics";

const field =
    "w-full rounded-2xl bg-vellum px-4 py-3 text-[15px] text-ink ring-1 ring-ink/12 outline-none placeholder:text-ink-muted/70 focus:ring-2 focus:ring-deep-angelite";

export const ContactForm = ({ defaultName, defaultEmail }: { defaultName?: string; defaultEmail?: string }) => {
    const [state, action, pending] = useActionState<ContactState, FormData>(sendMessage, { status: "idle" });

    if (state.status === "sent") {
        return (
            <div className="flex flex-col items-start gap-4 py-6" role="status">
                <CheckCircle className="size-10 text-deep-angelite" aria-hidden="true" />
                <h2 className="mkt-heading text-[28px] text-ink">Message sent</h2>
                <p className="max-w-md text-[16px] leading-relaxed text-ink-muted">
                    Thanks for writing. We read every message and reply by email, usually within a few days.
                </p>
            </div>
        );
    }

    return (
        <form action={action} className="flex flex-col gap-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                    <span className="text-[14px] font-medium text-ink">Name</span>
                    <input name="name" required maxLength={100} autoComplete="name" defaultValue={defaultName} className={field} />
                </label>
                <label className="flex flex-col gap-2">
                    <span className="text-[14px] font-medium text-ink">Email</span>
                    <input name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={defaultEmail} className={field} />
                </label>
            </div>
            <label className="flex flex-col gap-2">
                <span className="text-[14px] font-medium text-ink">What is it about?</span>
                <select name="topic" defaultValue="question" className={field}>
                    {TOPICS.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                            {topic.label}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col gap-2">
                <span className="text-[14px] font-medium text-ink">Message</span>
                <textarea
                    name="message"
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={6}
                    className={`${field} resize-y`}
                    placeholder="Tell us what's on your mind."
                />
            </label>
            {/* Honeypot: hidden from people, tempting to bots. */}
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {state.status === "error" && (
                <p role="alert" className="rounded-2xl bg-ink px-4 py-3 text-[14px] text-vellum">
                    {state.message}
                </p>
            )}
            <button
                type="submit"
                disabled={pending}
                className="self-start rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-vellum transition hover:bg-ink-soft disabled:opacity-60"
            >
                {pending ? "Sending…" : "Send message"}
            </button>
        </form>
    );
};
