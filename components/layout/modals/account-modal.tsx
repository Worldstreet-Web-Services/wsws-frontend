"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { WalletList } from "@/features/portfolio";
import { HelpIcon, SignOutIcon } from "@/components/ui/icons";
import { useAuthSession } from "@/hooks/use-auth-session";

interface AccountModalProps {
  onClose: () => void;
}

export function AccountModal({ onClose }: AccountModalProps) {
  const t = useTranslations("account");
  const { profile, logout } = useAuthSession();
  const router = useRouter();

  const signOut = async () => {
    await logout();
    router.push("/auth");
  };

  const item =
    "flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-3 font-sans text-[14.5px] font-medium hover:bg-white/8 transition-colors cursor-pointer w-full text-left";

  return (
    <div>
      <div className="flex items-center gap-[13px]">
        <Avatar seed={profile.avatarSeed} size={46} />
        <div className="min-w-0">
          <div className="ws-display truncate text-[21px]">{profile.name}</div>
          {profile.email ? (
            <div className="truncate text-[12.5px] font-normal text-white/50">{profile.email}</div>
          ) : null}
        </div>
      </div>
      <WalletList />
      <div className="mt-[18px] flex flex-col gap-1.5">
        <button onClick={onClose} className={`${item} text-white`}>
          <HelpIcon size={20} />
          {t("helpSupport")}
        </button>
        <button onClick={signOut} className={`${item} text-down`}>
          <SignOutIcon size={20} />
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}
