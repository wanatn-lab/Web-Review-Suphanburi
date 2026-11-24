export function canonicalSiteUrl(value?: string): string {
  const url = new URL(value || "https://www.reviewsuphanburi.com");
  if (["reviewsuphanburi.com", "www.reviewsuphanburi.com"].includes(url.hostname)) {
    url.protocol = "https:";
    url.hostname = "www.reviewsuphanburi.com";
    url.port = "";
  }
  return url.origin;
}

export const SITE_URL = canonicalSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const SITE_NAME = "รีวิวสุพรรณบุรี";
// English brand names people search for ("review suphan"). Used as
// schema.org alternateName so Google can tie the site to the brand.
export const SITE_ALTERNATE_NAMES = ["Review Suphan", "ReviewSuphan", "รีวิวสุพรรณ"];
export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/Reviewsuphan",
  tiktok: "https://www.tiktok.com/@reviewsuphan",
};
// Every official profile, for schema.org sameAs only (not shown in the UI).
export const SAME_AS_LINKS = [
  ...Object.values(SOCIAL_LINKS),
  "https://www.youtube.com/@%E0%B8%A3%E0%B8%B5%E0%B8%A7%E0%B8%B4%E0%B8%A7%E0%B8%AA%E0%B8%B8%E0%B8%9E%E0%B8%A3%E0%B8%A3%E0%B8%93%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5",
  "https://www.instagram.com/reviewsuphanburi/",
];
