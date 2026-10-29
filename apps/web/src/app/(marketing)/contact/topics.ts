// What a contact message can be about. Must match the check constraint on public.contact_messages.topic.
export const TOPICS = [
    { id: "question", label: "A question" },
    { id: "feedback", label: "Feedback" },
    { id: "bug", label: "Something isn't working" },
    { id: "business", label: "Business or press" },
    { id: "other", label: "Something else" },
] as const;
