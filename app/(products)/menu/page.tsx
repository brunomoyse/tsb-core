// app/product

import dynamic from "next/dynamic";
import { getClient } from "@/lib/server/client";

const CartSidebar = dynamic(() => import('@/components/menu/CartSidebar'), { ssr: false });
import {TAGS_WITH_PRODUCTS_QUERY} from "@/graphql/queries";
import ProductCard from "@/components/menu/ProductCard";
import TagItem from "@/components/menu/TagItem";
import * as React from "react";
import Navbar from "@/components/navbar/Navbar";


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
        <div>
            <header>
                <Navbar />
                <div className="h-20"></div>
            </header>
            <main className="mx-auto container flex sm:grid sm:grid-cols-12">

                {/* Shortcut Sidebar */}
                <aside className="overflow-y-auto hidden sm:flex justify-center sm:col-span-4 md:col-span-2">
                    <ul className="my-8 fixed">
                        {tags.map((tag: any) => (
                            <li key={tag.id}>
                                <TagItem tag={tag} />
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Products */}
                <div className="flex-1 my-8 sm:col-span-8 md:col-span-10">
                    {tags.map((tag: any) => (
                        tag.products && tag.products.length > 0 ? (
                            <section key={tag.id} id={tag.id} className="mb-20 px-8">
                                <h2 className="font-['Channel'] min-w-fit select-none text-2xl flex justify-center mb-4 py-8">{tag.productTagTranslations[0].name}</h2>
                                <div className="grid xs: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {tag.products.map((item: any, index: number) => (
                                        <div key={item.id}>
                                            <ProductCard product={item} priority={index < 17} />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null
                    ))}
                </div>

                <aside>
                    <CartSidebar />
                </aside>
            </main>
        </div>
    );
}
