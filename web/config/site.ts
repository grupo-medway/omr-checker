export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Título do site",
  description: "Descrição do site",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://guilhermeboia.com",
  ogImage: "link-da-imagem",
  creator: "Título do site",
  keywords: ["Título do site"],
} as const;
