/** Only allow same-site relative paths, so `?next=` can't redirect users to another domain. */
export const safeNextPath = (value: FormDataEntryValue | string | null | undefined, fallback = "/studio") => {
    const path = typeof value === "string" ? value : "";
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
};
