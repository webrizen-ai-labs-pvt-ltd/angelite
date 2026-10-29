import { createAdminClient } from "@/lib/supabase/server";
import { HISTORY_RETENTION_DAYS } from "@/lib/usage";

// Daily Vercel Cron job: deletes generated audio older than the retention window to stay within Supabase's free storage.
const BATCH = 500;

export async function GET(request: Request) {
    if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    let deleted = 0;

    // Loop in batches; a daily run normally finishes in one pass.
    for (;;) {
        const { data: rows, error } = await supabase.from("generations").select("id, audio_path").lt("created_at", cutoff).limit(BATCH);
        if (error) return Response.json({ error: error.message, deleted }, { status: 500 });
        if (!rows?.length) break;

        const removal = await supabase.storage.from("generations").remove(rows.map((row) => row.audio_path));
        if (removal.error) return Response.json({ error: removal.error.message, deleted }, { status: 500 });

        const { error: deleteError } = await supabase
            .from("generations")
            .delete()
            .in(
                "id",
                rows.map((row) => row.id),
            );
        if (deleteError) return Response.json({ error: deleteError.message, deleted }, { status: 500 });

        deleted += rows.length;
        if (rows.length < BATCH) break;
    }

    return Response.json({ deleted });
}
