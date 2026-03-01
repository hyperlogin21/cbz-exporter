/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist tries to require the native 'canvas' module during SSR/build;
    // alias it to false so webpack emits an empty shim instead of failing.
    // pdfjs-dist itself is loaded at runtime from /public (not bundled by webpack)
    // to avoid the ESM namespace / Object.defineProperty incompatibility in v5.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
