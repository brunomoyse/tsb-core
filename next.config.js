/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        formats: ['image/avif', 'image/webp']
    },
    env: {
        API_FILE_ENDPOINT: process.env.NEXT_PUBLIC_API_FILE_ENDPOINT,
        AWS_S3_BUCKET_ENDPOINT: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_ENDPOINT
    },
}

module.exports = nextConfig
