import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReviewBySlug } from "@/lib/supabase";
import { reviewVideo, videoSchema } from "@/lib/video-metadata";
import { buildMetaDescription } from "@/lib/seo-text";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const review = await getReviewBySlug((await params).slug);
  if (!review || !reviewVideo(review)) return { title: "ไม่พบวิดีโอ", robots: { index: false } };
  return {
    title: `ชมวิดีโอ ${review.title}`,
    description: buildMetaDescription(review.description || `วิดีโอรีวิว ${review.title}`, "วิดีโอรีวิวสุพรรณบุรี", 155),
    alternates: { canonical: `/watch/${review.slug}` },
    openGraph: { type: "video.other", url: `/watch/${review.slug}`, images: review.cover_image ? [review.cover_image] : [] },
  };
}

export default async function WatchPage({ params }: Props) {
  const review = await getReviewBySlug((await params).slug);
  const video = review && reviewVideo(review);
  if (!review || !video) notFound();
  const schema = videoSchema(review);
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
      <h1 className="mb-4 text-xl font-extrabold sm:text-2xl">ชมวิดีโอ {review.title}</h1>
      <div className={`mx-auto overflow-hidden rounded-xl bg-black ${video.provider === "youtube" ? "aspect-video w-full" : "aspect-[9/16] w-full max-w-sm"}`}>
        <iframe src={video.embedUrl} title={`วิดีโอรีวิว ${review.title}`} className="h-full w-full border-0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      </div>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
      <p className="mt-5 text-sm leading-7">{review.description || `วิดีโอรีวิว ${review.title} จาก รีวิวสุพรรณบุรี`}</p>
      <p className="mt-3 text-xs text-neutral-500">เผยแพร่รีวิวโดย <Link href="/about" rel="author" className="underline">รีวิวสุพรรณบุรี</Link> · <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("th-TH")}</time></p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-[#B62F08]">
        <Link href={`/reviews/${review.slug}`} className="inline-flex min-h-11 items-center underline">อ่านรีวิวและดูพิกัด</Link>
        <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">ดูวิดีโอต้นฉบับบน {video.provider === "youtube" ? "YouTube" : video.provider === "tiktok" ? "TikTok" : "Facebook"}</a>
      </div>
    </main>
  );
}
