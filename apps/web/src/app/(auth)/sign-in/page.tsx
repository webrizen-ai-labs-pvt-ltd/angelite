import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
    const { next, error } = await searchParams;

    return <AuthForm mode="sign-in" next={next} initialError={error} />;
}
