import { describe, expect, it } from 'vite-plus/test'
import { menuItemImage } from './menuSchema'

const base = { baseUrl: 'https://shop.test', s3BaseUrl: 'https://s3.test' }

describe('menuItemImage', () => {
  it('a brand photo given as a site-relative path is made absolute', () => {
    expect(
      menuItemImage(
        { id: 'p1', slug: 'bowl' },
        { ...base, photoFor: () => ({ png: '/images/bowl.png', webp: '/images/bowl.webp' }) },
      ),
    ).toEqual({
      '@type': 'ImageObject',
      url: 'https://shop.test/images/bowl.png',
      contentUrl: 'https://shop.test/images/bowl.webp',
      thumbnail: 'https://shop.test/images/bowl.png',
    })
  })

  it('a brand photo that is already an absolute URL is left as it is', () => {
    const image = menuItemImage(
      { id: 'p1', slug: 'bowl' },
      {
        ...base,
        photoFor: () => ({ png: 'https://cdn.test/a.png', webp: 'https://cdn.test/a.webp' }),
      },
    )
    expect(image).toMatchObject({
      url: 'https://cdn.test/a.png',
      contentUrl: 'https://cdn.test/a.webp',
    })
  })

  it('without a brand photo it uses the S3 thumbnail of the product, or the placeholder without a bucket', () => {
    expect(
      menuItemImage({ id: 'p1', slug: 's' }, { ...base, photoFor: () => undefined }),
    ).toMatchObject({
      url: 'https://s3.test/images/thumbnails/p1.png',
      contentUrl: 'https://s3.test/images/thumbnails/p1.webp',
    })
    expect(menuItemImage({ id: 'p1', slug: 's' }, { baseUrl: 'https://shop.test' })).toMatchObject({
      url: 'https://shop.test/images/placeholder-product-thumbnail.png',
    })
  })
})
