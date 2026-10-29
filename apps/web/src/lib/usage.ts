export type UsageProfile = { monthly_character_limit: number; characters_used: number; usage_period_start: string };

/** Characters used this calendar month (UTC, like the database). A stale period counts as zero. */
export const charactersUsedThisMonth = (profile: UsageProfile) => {
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
    return profile.usage_period_start < monthStart ? 0 : profile.characters_used;
};

/** Generated audio older than this is deleted by the daily cleanup job. */
export const HISTORY_RETENTION_DAYS = 30;
