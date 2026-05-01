import { useHead } from '#imports'

type JsonLdNode = Record<string, unknown>

export function useJsonLd(nodes: JsonLdNode | JsonLdNode[], key = 'jsonld') {
    const arr = Array.isArray(nodes) ? nodes : [nodes]
    useHead({
        script: [{
            type: 'application/ld+json',
            innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': arr }),
            tagPosition: 'head',
            key,
        }],
    })
}

export function breadcrumbList(items: { name: string; item: string }[]): JsonLdNode {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: it.name,
            item: it.item,
        })),
    }
}
