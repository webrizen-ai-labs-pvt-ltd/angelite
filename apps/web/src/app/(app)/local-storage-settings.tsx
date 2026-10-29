"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderClosed, HardDrive } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { type StorageInfo, chooseFolder, ensureFolderAccess, getStorageInfo, switchToBrowserStorage } from "@/lib/local-library";

/** Shows where on-device clips are saved, with controls to pick a folder or go back to browser storage. */
export const LocalStorageSettings = ({ compact, onChange }: { compact?: boolean; onChange?: () => void }) => {
    const [info, setInfo] = useState<StorageInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(() => {
        getStorageInfo()
            .then(setInfo)
            .catch(() => setInfo({ mode: "browser", supportsFolders: false }));
    }, []);

    useEffect(refresh, [refresh]);

    const run = async (action: () => Promise<unknown>) => {
        setError(null);
        try {
            await action();
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : "Couldn't change where clips are saved");
        }
        refresh();
        onChange?.();
    };

    if (!info) return null;

    const needsAccess = info.mode === "folder" && info.permission !== "granted";
    const Icon = info.mode === "folder" ? FolderClosed : HardDrive;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <p className="flex min-w-0 items-center gap-2 text-sm text-tertiary">
                    <Icon className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />
                    <span className="truncate">
                        {info.mode === "folder" ? (
                            <>
                                Saving to the <span className="font-medium text-secondary">{info.folderName}</span> folder
                                {needsAccess && " (needs permission)"}
                            </>
                        ) : (
                            "Saving in this browser's private storage"
                        )}
                    </span>
                </p>
                <div className="flex gap-3">
                    {needsAccess && (
                        <Button color="link-color" size="sm" onPress={() => run(ensureFolderAccess)}>
                            Allow access
                        </Button>
                    )}
                    {info.supportsFolders && (
                        <Button color="link-color" size="sm" onPress={() => run(chooseFolder)}>
                            {info.mode === "folder" ? "Change folder" : "Save to a folder"}
                        </Button>
                    )}
                    {info.mode === "folder" && (
                        <Button color="link-gray" size="sm" onPress={() => run(switchToBrowserStorage)}>
                            Use browser storage
                        </Button>
                    )}
                </div>
            </div>
            {!compact && !info.supportsFolders && (
                <p className="text-xs text-quaternary">Saving to a folder of your choice works in Chrome and Edge on desktop.</p>
            )}
            {error && <p className="text-sm text-error-primary">{error}</p>}
        </div>
    );
};
