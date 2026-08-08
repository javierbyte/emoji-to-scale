/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/emoji-to-scale',
  // Opt out of Next 16.3's immutable static assets. With it on, the deploy
  // adapter is asked to serve assets from `/_next/static/immutable/*` instead
  // of `/_next/static/*` — and on this deployment nothing is served there, so
  // every stylesheet, chunk and font 404s and both pages render bare.
  // It can't be caught locally: without an adapter the flag stays off, so a
  // plain `next build` here emits the old paths and looks fine either way.
  supportsImmutableAssets: false,
};

export default nextConfig;
