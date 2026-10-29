import type { Metadata } from "next";
import { PageHeader } from "../page-header";
import { LabClient } from "./lab-client";

export const metadata: Metadata = { title: "Browser lab" };

export default function LabPage() {
    return (
        <div className="mx-auto flex max-w-container flex-col gap-8 px-4 lg:px-8">
            <PageHeader title="Browser lab" description="Clone a voice and generate speech entirely on your device. No server, no upload." />
            <LabClient />
        </div>
    );
}
