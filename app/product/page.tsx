import { getClient } from "@/lib/client";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar"
import { PRODUCTS_QUERY } from "@/graphql/queries";

export default async function Page() {
    const { data } = await getClient().query({
        query: PRODUCTS_QUERY,
        variables: {
            first: 9,
            page: 1,
            lang: 'FR',
            tags: ["99df9038-0885-4043-9f36-9fdc18de167f"],
            search: null
        },
    });
    const products = data?.products?.data;

    return (
        <main className="flex mx-auto">

            {/* Shortcut Sidebar */}
            <aside className="w-1/6 p-4">

            </aside>

            {/* Products */}
            <div className="flex-1 p-4">
                <div className="grid grid-cols-3 gap-4">
                    {products.map((item: any) => (
                        <div key={item.id}>
                            <ProductCard product={item} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Sidebar */}
            <aside className="w-1/5 p-4">
                <CartSidebar />
            </aside>
        </main>
    );
}
