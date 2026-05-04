import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { CANONICAL_ORIGIN } from "@/seo/site";
import { canonicalUrlForPath, getRouteSeo } from "@/seo/routeSeoConfig";

const DEFAULT_OG_IMAGE = `${CANONICAL_ORIGIN}/snaptagtrack_1.jpg`;

export function RouteSeo() {
  const { pathname } = useLocation();
  const seo = getRouteSeo(pathname);
  const canonicalHref = canonicalUrlForPath(pathname);

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {seo.robots ? <meta name="robots" content={seo.robots} /> : <meta name="robots" content="index, follow" />}
      <link rel="canonical" href={canonicalHref} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalHref} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
    </Helmet>
  );
}
