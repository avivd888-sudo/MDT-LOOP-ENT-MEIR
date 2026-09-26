"use client";

import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon } from "./ui";

/**
 * Whether the team's board actually has this change.
 *
 * A coordination tool earns its place by being trusted, and trust needs the
 * save state to be visible rather than assumed. The two states that matter are
 * the uncomfortable ones: "this board is only on your device", and "your last
 * change was not saved" — both are stated plainly, because a clinician who
 * believes a handover was recorded when it was not is worse off than one who
 * knows it failed.
 *
 * Nothing here blinks. An indicator that demands attention on every save is one
 * clinicians learn to stop seeing.
 */
export function SyncBadge() {
  const { sync } = useStore();
  const { t } = useLang();

  const spec = {
    local: {
      icon: "devices",
      label: t("This device only", "במכשיר הזה בלבד"),
      cls: "text-[var(--color-ink-faint)]",
      title: t(
        "Not a shared board: changes stay in this browser.",
        "הלוח אינו משותף: השינויים נשארים בדפדפן הזה.",
      ),
    },
    loading: {
      icon: "cloud_sync",
      label: t("Opening", "נפתח"),
      cls: "text-[var(--color-ink-muted)]",
      title: t("Reading the team board.", "קורא את לוח הצוות."),
    },
    ready: {
      icon: "groups",
      label: t("Shared", "משותף"),
      cls: "text-[var(--color-stable)]",
      title: t("This board is shared with the team.", "הלוח הזה משותף לצוות."),
    },
    saving: {
      icon: "cloud_sync",
      label: t("Saving", "שומר…"),
      cls: "text-[var(--color-primary)]",
      title: sync.detail ?? t("Saving to the team board.", "שומר אל לוח הצוות."),
    },
    saved: {
      icon: "cloud_done",
      label: t("Saved", "נשמר"),
      cls: "text-[var(--color-stable)]",
      title: t("Recorded on the team board.", "נרשם בלוח הצוות."),
    },
    readonly: {
      icon: "visibility",
      label: t("View only", "צפייה בלבד"),
      cls: "text-[#fcd34d]",
      title:
        sync.detail ??
        t("You can read this board but not change it.", "אפשר לקרוא את הלוח אך לא לשנות אותו."),
    },
    error: {
      icon: "cloud_off",
      label: t("Not saved", "לא נשמר"),
      cls: "text-[#fca5a5]",
      title: sync.detail ?? t("Your last change was not saved.", "השינוי האחרון שלך לא נשמר."),
    },
  }[sync.status];

  return (
    <span
      title={spec.title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-1 text-[10px] font-semibold ${spec.cls}`}
    >
      <Icon name={spec.icon} size={13} />
      {spec.label}
    </span>
  );
}
