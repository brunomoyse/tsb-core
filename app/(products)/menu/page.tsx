// app/product

import dynamic from "next/dynamic";
import { getClient } from "@/lib/server/client";

const CartSidebar = dynamic(() => import('@/components/CartSidebar'), { ssr: false });
import {TAGS_WITH_PRODUCTS_QUERY} from "@/graphql/queries";
import ProductCard from "@/components/ProductCard";
import TagItem from "@/components/TagItem";
import * as React from "react";


export default async function Page() {
    const { data: res } = await getClient().query({
        query: TAGS_WITH_PRODUCTS_QUERY,
        variables: {
            lang: 'FR'
        },
    });

    let tags = structuredClone(res?.tags);

    tags.forEach((tag: ProductTag) => {
        if (tag.products.length > 0) {
            tag.products.sort((a, b) => {
                const nameA = a.productTranslations[0].name;
                const nameB = b.productTranslations[0].name;

                if (nameA < nameB) {
                    return -1;
                }

                if (nameA > nameB) {
                    return 1;
                }

                return 0;
            });
        }
    });

    return (
        <main className="flex mx-auto container">

            {/* Shortcut Sidebar */}
            <aside className="w-1/5 overflow-y-auto">
                <ul className="my-8 fixed">
                    {tags.map((tag: any) => (
                        <div key={tag.id}>
                            <TagItem tag={tag} />
                        </div>
                    ))}
                </ul>
            </aside>

            {/* Products */}
            <div className="flex-1 my-8">
                    {tags.map((tag: any) => (
                        tag.products && tag.products.length > 0 ? (
                            <section key={tag.id} id={tag.id} className="mb-6">
                                <h2 className="min-w-fit text-2xl flex justify-center mb-6">{tag.productTagTranslations[0].name}</h2>
                                <div className="grid xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                    {tag.products.map((item: any) => (
                                        <div key={item.id}>
                                            <ProductCard product={item} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null
                    ))}
            </div>

            {/* Cart Sidebar
            <aside className="w-1/5 p-4">
                <CartSidebar />
            </aside>*/}
        </main>
    );
}
