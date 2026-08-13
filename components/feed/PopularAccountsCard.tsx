import Image from "next/image";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { FeedSidebarCard } from "@/components/feed/FeedSidebarCard";
import { buildProfileURL, isExternalUrl } from "@/lib/utils";

export interface PopularAccount {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  followers: number;
  profileUsername?: string | null;
}

interface PopularAccountsCardProps {
  accounts: PopularAccount[];
  className?: string;
}

function formatFollowers(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} підписник`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} підписники`;
  }
  return `${count} підписників`;
}

function AccountRow({ account }: { account: PopularAccount }) {
  const row = (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-graphite">
        {account.avatarUrl ? (
          <Image
            src={account.avatarUrl}
            alt={account.displayName}
            fill
            sizes="40px"
            className="object-cover"
            unoptimized={isExternalUrl(account.avatarUrl)}
          />
        ) : (
          <UserRound className="h-full w-full p-2 text-ash" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-sans text-sm font-medium text-bone">{account.displayName}</p>
        <p className="truncate font-sans text-[11px] text-ash">@{account.username}</p>
        <p className="font-sans text-[11px] text-ash/70">{formatFollowers(account.followers)}</p>
      </div>
    </div>
  );

  if (account.profileUsername) {
    return (
      <Link
        href={buildProfileURL(account.profileUsername)}
        className="block rounded-lg transition-colors duration-fast hover:bg-graphite/40"
      >
        {row}
      </Link>
    );
  }

  return row;
}

export function PopularAccountsCard({ accounts, className }: PopularAccountsCardProps) {
  return (
    <FeedSidebarCard
      title="Популярні акаунти"
      subtitle="і акаунт адміна ;)"
      className={className}
    >
      <div className="divide-y divide-line/40">
        {accounts.map((account) => (
          <AccountRow key={account.username} account={account} />
        ))}
      </div>
    </FeedSidebarCard>
  );
}
