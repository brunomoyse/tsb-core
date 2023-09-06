import { getClient } from "@/lib/server/client";
import {ORDER_QUERY} from "@/graphql/queries";
import ClearCart from "@/components/menu/ClearCart";

export default async function Page({
     params
 }: {
    params: { id: string }
}) {

    const { data } = await getClient().query({
        query: ORDER_QUERY,
        variables: {
            lang: 'FR',
            id: params.id
        },
        fetchPolicy: 'network-only'
    });

    return (
        <main className="flex flex-col items-center justify-between p-24">
            <ClearCart />  {/* Just including this component will trigger the cart clear */}
            <h3>La commande {data.order.id} a été payée correctement!</h3>
            La commande est composée de:
            <ul>
                {data.order.products.map((item:any) => (
                    <li key={item.id}>{item.productTranslations[0].name} ({item.pivot.quantity} x)</li>
                ))}
            </ul>
        </main>
    );
}
