import type { User } from "@/db/schema";

export type ProfileProgress = {
  completed: number;
  total: number;
  percent: number;
  nextLabel: string;
  nextHref: string;
};

export function profileProgress(user: User): ProfileProgress {
  const checks = [
    { done: Boolean(user.avatarUrl), label: "Add a profile photo", href: "/me/edit" },
    { done: Boolean(user.bio || user.tagline), label: "Write your intro", href: "/me/edit" },
    { done: Boolean(user.sport), label: "Choose your sport", href: "/me/edit" },
    { done: Boolean(user.county), label: "Add your county", href: "/me/edit" },
    ...(user.role === "athlete"
      ? [
          { done: user.skills.length > 0, label: "Add your skills", href: "/me/edit" },
          { done: user.openToOpportunities, label: "Set your opportunity status", href: "/me/edit" },
        ]
      : []),
  ];
  const completed = checks.filter((check) => check.done).length;
  const next = checks.find((check) => !check.done) ?? { label: "Share your profile", href: `/u/${user.handle}` };
  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    nextLabel: next.label,
    nextHref: next.href,
  };
}

