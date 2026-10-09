import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, Clock, Globe, Mail, MapPin, Megaphone, MessageCircle, Pencil, Phone, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getBusiness } from "@/lib/market";
import { categoryLabel } from "@/lib/constants";
import { ShareButton } from "@/components/feed/buttons";
import { BusinessLogo } from "@/components/market/ad-card";
import { BusinessCover, VerifiedBusiness, ksh } from "@/components/market/business-card";

export async function generateMetadata({ params }: PageProps<"/market/[slug]">): Promise<Metadata> {
  const b = await getBusiness((await params).slug);
  return b ? { title: b.name, description: b.description.slice(0, 160) } : { title: "Not found" };
}

export default async function BusinessPage({ params }: PageProps<"/market/[slug]">) {
  const [b, viewer] = await Promise.all([getBusiness((await params).slug), getCurrentUser()]);
  const owner = !!viewer && viewer.id === b?.ownerId;
  if (!b || (!b.active && !owner && !viewer?.isAdmin)) notFound();
  const wa = b.whatsapp?.replace(/\D/g, "");

  return (
    <div>
      <div className="relative">
        <BusinessCover b={b} className="h-52 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-offwhite via-transparent to-navy/30" />
        <Link href="/market" className="pressable glass-dark absolute left-3 top-3 inline-flex items-center gap-1 rounded-full py-1.5 pl-2 pr-3 text-[13px] font-semibold text-white">
          <ChevronLeft size={16} /> Marketplace
        </Link>
      </div>

      <div className="relative -mt-12 px-4">
        <div className="animate-fade-slide-up flex items-end gap-3">
          <BusinessLogo name={b.name} url={b.logoUrl} size={84} className="rounded-2xl ring-4 ring-offwhite" />
          <div className="ml-auto pb-1">
            <div className="rounded-full bg-navy p-0.5">
              <ShareButton path={`/market/${b.slug}`} title={b.name} />
            </div>
          </div>
        </div>
        <p className="animate-fade-slide-up ad-100 mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{categoryLabel(b.category)}</p>
        <h1 className="animate-fade-slide-up ad-200 mt-1 flex flex-wrap items-center gap-2 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          {b.name} {b.verified && <VerifiedBusiness />}
        </h1>
        <p className="animate-fade-slide-up ad-300 mt-1 flex items-center gap-1 text-[14px] text-muted">
          <MapPin size={14} /> {[b.address, b.county].filter(Boolean).join(", ")}
        </p>
        {!b.active && <p className="mt-3 rounded-lg bg-warning/20 px-3 py-2 text-[13px]">This listing is hidden from the marketplace.</p>}

        {/* Contact actions */}
        <div className="animate-fade-slide-up ad-400 mt-5 grid grid-cols-2 gap-2">
          {wa && (
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi ${b.name}, I found you on Riadha.`)}`} target="_blank" rel="noreferrer" className="btn btn-accent">
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          {b.phone && (
            <a href={`tel:${b.phone}`} className="btn btn-primary">
              <Phone size={16} /> Call
            </a>
          )}
          {b.email && (
            <a href={`mailto:${b.email}`} className="btn btn-secondary">
              <Mail size={16} /> Email
            </a>
          )}
          {b.website && (
            <a href={b.website} target="_blank" rel="noreferrer nofollow" className="btn btn-secondary">
              <Globe size={16} /> Website
            </a>
          )}
        </div>

        {owner && (
          <div className="mt-4 flex gap-2">
            <Link href={`/market/${b.slug}/edit`} className="btn btn-sm btn-secondary">
              <Pencil size={14} /> Edit listing
            </Link>
            <Link href={`/market/ads/new?business=${b.id}`} className="btn btn-sm btn-cobalt">
              <Megaphone size={14} /> Promote
            </Link>
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-2" data-stagger="80">
          {b.priceFrom !== null && (
            <div data-reveal="up" className="rounded-2xl bg-navy p-4 text-white">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55"><Wallet size={13} /> From</dt>
              <dd className="mt-1 text-[24px] font-bold tracking-[-0.03em]">{ksh(b.priceFrom)}</dd>
            </div>
          )}
          {b.hours && (
            <div data-reveal="up" className="rounded-2xl border border-line bg-surface p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"><Clock size={13} /> Hours</dt>
              <dd className="mt-1 text-[15px] font-semibold leading-snug">{b.hours}</dd>
            </div>
          )}
        </dl>

        <section className="mt-6" data-reveal="up">
          <h2 className="h5">About</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{b.description}</p>
        </section>

        {b.amenities.length > 0 && (
          <section className="mt-6">
            <h2 className="h5">Amenities</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2" data-stagger="40">
              {b.amenities.map((a) => (
                <li key={a} data-reveal="up" className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green text-navy"><Check size={12} strokeWidth={3} /></span>
                  {a}
                </li>
              ))}
            </ul>
          </section>
        )}

        {b.sports.length > 0 && (
          <section className="mt-6">
            <h2 className="h5">For</h2>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {b.sports.map((s) => (
                <Link key={s} href={`/market?sport=${s}`} className="rounded-full bg-navy px-3 py-1.5 text-[12px] font-semibold text-white">{s}</Link>
              ))}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
