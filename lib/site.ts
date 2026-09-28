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
export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/Reviewsuphan",
  tiktok: "https://www.tiktok.com/@reviewsuphan",
};
