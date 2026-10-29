"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { TOPICS } from "./topics";

export type ContactState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
    // Bots fill every field; people never see this one.
    if (String(form.get("website") ?? "")) return { status: "sent" };

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const topic = String(form.get("topic") ?? "question");
    const message = String(form.get("message") ?? "").trim();

    if (!name || name.length > 100) return { status: "error", message: "Enter your name." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { status: "error", message: "Enter a valid email address so we can reply." };
    if (!TOPICS.some((item) => item.id === topic)) return { status: "error", message: "Choose what your message is about." };
    if (message.length < 10) return { status: "error", message: "Write a little more, at least 10 characters." };
    if (message.length > 5000) return { status: "error", message: "Keep your message under 5,000 characters." };

    const user = await getCurrentUser();
    const supabase = await createClient();
    const { error } = await supabase.from("contact_messages").insert({ name, email, topic, message, user_id: user?.id ?? null });
    if (error) {
        console.error("Contact message failed", error);
        return { status: "error", message: "Your message couldn't be sent right now. Please try again in a few minutes." };
    }
    return { status: "sent" };
}
