"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Mail01 } from "@untitledui/icons";
import Link from "next/link";
import { cx } from "@/utils/cx";
import { type AuthState, signIn, signUp } from "./actions";

interface AuthFormProps {
    mode: "sign-in" | "sign-up";
    next?: string;
    initialError?: string;
}

const MIN_PASSWORD = 8;

const fieldClass =
    "w-full rounded-2xl bg-vellum-card px-4 py-3.5 text-[15px] text-ink ring-1 ring-ink/12 outline-none transition placeholder:text-ink-muted/60 focus:ring-2 focus:ring-deep-angelite";

const Field = ({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) => (
    <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3 text-[14px] font-medium text-ink">
            {label}
            {hint}
        </span>
        {children}
    </label>
);

export const AuthForm = ({ mode, next, initialError }: AuthFormProps) => {
    const isSignUp = mode === "sign-up";
    const [state, formAction, isPending] = useActionState<AuthState, FormData>(isSignUp ? signUp : signIn, { error: initialError });
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const strength = Math.min(1, password.length / MIN_PASSWORD);

    if (state.message) {
        return (
            <div className="flex flex-col items-start gap-5" role="status">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-angelite/25 text-deep-angelite">
                    <Mail01 className="size-7" aria-hidden="true" />
                </span>
                <h1 className="mkt-display text-[40px] text-ink">Check your email</h1>
                <p className="text-[16px] leading-relaxed text-ink-muted">{state.message}</p>
                <p className="text-[14px] text-ink-muted">
                    Nothing there? Check spam, or{" "}
                    <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4">
                        try again
                    </Link>
                    .
                </p>
            </div>
        );
    }

    return (
        <form action={formAction} className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
                <span className="w-max rounded-full bg-vellum-card px-3 py-1 text-[13px] text-ink-muted ring-1 ring-ink/10">
                    {isSignUp ? "Free to start, no card needed" : "Welcome back"}
                </span>
                <h1 className="mkt-display text-[clamp(2.25rem,4vw,2.9rem)] text-ink">{isSignUp ? "Create your account" : "Sign in to Angelite"}</h1>
                <p className="text-[16px] leading-relaxed text-ink-muted">
                    {isSignUp ? "Start making voices in under a minute." : "Open your studio, voices and history."}
                </p>
            </div>

            <div className="flex flex-col gap-5">
                {isSignUp && (
                    <Field label="Name" hint={<span className="text-[13px] font-normal text-ink-muted">Optional</span>}>
                        <input name="name" autoComplete="name" placeholder="How should we greet you?" maxLength={80} className={fieldClass} />
                    </Field>
                )}
                <Field label="Email">
                    <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={fieldClass} />
                </Field>
                <Field
                    label="Password"
                    hint={
                        !isSignUp && (
                            <Link href="/contact" className="text-[13px] font-normal text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                                Forgot it?
                            </Link>
                        )
                    }
                >
                    <div className="relative">
                        <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={isSignUp ? MIN_PASSWORD : undefined}
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            placeholder={isSignUp ? `At least ${MIN_PASSWORD} characters` : "Your password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className={cx(fieldClass, "pr-12")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted transition hover:bg-vellum hover:text-ink"
                        >
                            {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
                        </button>
                    </div>
                    {isSignUp && (
                        <span className="flex items-center gap-3" aria-live="polite">
                            <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
                                <span
                                    className={cx("block h-full rounded-full transition-all", strength >= 1 ? "bg-deep-angelite" : "bg-ink/40")}
                                    style={{ width: `${strength * 100}%` }}
                                />
                            </span>
                            <span className="text-[12px] text-ink-muted tabular-nums">
                                {password.length >= MIN_PASSWORD ? "Long enough" : `${password.length} / ${MIN_PASSWORD}`}
                            </span>
                        </span>
                    )}
                </Field>
                {next && <input type="hidden" name="next" value={next} />}
            </div>

            {state.error && (
                <p role="alert" className="flex items-start gap-2.5 rounded-2xl bg-ink px-4 py-3 text-[14px] text-vellum">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-angelite" aria-hidden="true" />
                    {state.error}
                </p>
            )}

            <div className="flex flex-col gap-4">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center justify-between gap-3 rounded-full bg-ink py-2 pr-2 pl-6 text-[15px] font-medium text-vellum transition hover:bg-ink-soft disabled:opacity-60"
                >
                    {isPending ? (isSignUp ? "Creating your account…" : "Signing in…") : isSignUp ? "Create account" : "Sign in"}
                    <span className="flex size-9 items-center justify-center rounded-full bg-vellum text-ink">
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                </button>
                {isSignUp && (
                    <p className="text-[13px] leading-relaxed text-ink-muted">
                        By creating an account you agree to the{" "}
                        <Link href="/terms" className="text-ink underline underline-offset-2">
                            Terms of use
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-ink underline underline-offset-2">
                            Privacy
                        </Link>
                        , including only cloning voices you have permission to use.
                    </p>
                )}
            </div>

            <p className="border-t border-ink/10 pt-6 text-[15px] text-ink-muted">
                {isSignUp ? "Already have an account? " : "New to Angelite? "}
                <Link href={isSignUp ? "/sign-in" : "/sign-up"} className="font-medium text-ink underline underline-offset-4">
                    {isSignUp ? "Sign in" : "Create a free account"}
                </Link>
            </p>
        </form>
    );
};
