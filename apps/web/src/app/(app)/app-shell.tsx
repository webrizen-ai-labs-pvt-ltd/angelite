"use client";

import type { ReactNode } from "react";
import { Beaker02, ClockRewind, LogOut01, Recording02, UserSquare } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { Avatar } from "@/components/base/avatar/avatar";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";

const NAV_ITEMS = [
    { label: "Studio", href: "/studio", icon: Recording02 },
    { label: "Voices", href: "/voices", icon: UserSquare },
    { label: "History", href: "/history", icon: ClockRewind },
    { label: "Browser lab", href: "/lab", icon: Beaker02 },
];

interface AppShellProps {
    email: string;
    displayName: string | null;
    isPro: boolean;
    charactersUsed: number;
    characterLimit: number;
    children: ReactNode;
}

export const AppShell = ({ email, displayName, isPro, charactersUsed, characterLimit, children }: AppShellProps) => {
    const pathname = usePathname();
    const activeUrl = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.href;
    const name = displayName || email.split("@")[0];

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSimple
                activeUrl={activeUrl}
                items={NAV_ITEMS}
                featureCard={
                    isPro ? (
                        <div className="flex flex-col gap-1 rounded-xl bg-secondary px-4 py-5">
                            <p className="text-sm font-semibold text-primary">Pro plan</p>
                            <p className="text-sm text-tertiary">Unlimited characters and voices. {charactersUsed.toLocaleString()} used this month.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 rounded-xl bg-secondary px-4 py-5">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold text-primary">Free plan</p>
                                <p className="text-sm text-tertiary">
                                    {charactersUsed.toLocaleString()} of {characterLimit.toLocaleString()} characters used this month
                                </p>
                            </div>
                            <ProgressBarBase value={Math.min(charactersUsed, characterLimit)} max={characterLimit} />
                            <p className="text-xs text-quaternary">On-device generation doesn't count.</p>
                        </div>
                    )
                }
                accountCard={
                    <div className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
                        <Avatar initials={name.slice(0, 2).toUpperCase()} size="md" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-primary">{name}</p>
                            <p className="truncate text-sm text-tertiary">{email}</p>
                        </div>
                        <form action="/auth/sign-out" method="post">
                            <ButtonUtility type="submit" icon={LogOut01} size="xs" color="tertiary" tooltip="Sign out" />
                        </form>
                    </div>
                }
            />
            <main className="min-w-0 flex-1 pt-8 pb-12 lg:pt-12">{children}</main>
        </div>
    );
};
