// app/product

import dynamic from "next/dynamic";
import { getClient } from "@/lib/server/client";

const CartSidebar = dynamic(() => import('@/components/menu/CartSidebar'), { ssr: false });
import {TAGS_WITH_PRODUCTS_QUERY} from "@/graphql/queries";
import ProductCard from "@/components/menu/ProductCard";
import TagItem from "@/components/menu/TagItem";
import * as React from "react";
import Navbar from "@/components/navbar/Navbar";
import ProductDetailDialog from "@/components/menu/ProductDetailDialog";

export default async function Page() {
    const { data: res } = await getClient().query({
        query: TAGS_WITH_PRODUCTS_QUERY,
        variables: {
            locale: 'FR'
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
        <div className="w-full">
            <header>
                <Navbar />
                <div className="h-20"></div>
            </header>
            <main className="w-screen sm:grid sm:grid-cols-12">

                {/* Shortcut Sidebar */}
                <aside className="overflow-y-auto hidden sm:flex justify-center sm:col-span-3 md:col-span-2">
                    <ul className="my-8 fixed">
                        {tags.map((tag: any) => (
                            <li key={tag.id}>
                                <TagItem tag={tag} />
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Products */}
                <div className="flex-1 my-8 sm:col-span-6 md:col-span-7">
                    {tags.map((tag: any) => (
                        tag.products && tag.products.length > 0 ? (
                            <section key={tag.id} id={tag.id} className="mb-20 px-8">
                                <h2 className="font-['Channel'] min-w-fit select-none text-2xl flex justify-center mb-4 py-8">{tag.productTagTranslations[0].name}</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                                    {tag.products.map((item: any, index: number) => (
                                        <div key={item.id}>
                                            <ProductCard product={item} priority={index < 17} />
                                        </div>
                                    ))}
                                </div>
                                <ProductDetailDialog />
                            </section>
                        ) : null
                    ))}
                </div>

                <aside className="col-span-3">
                    <CartSidebar />
                </aside>
            </main>
        </div>
    );
}
