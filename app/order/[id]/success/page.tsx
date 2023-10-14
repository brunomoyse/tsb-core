import { getClient } from "@/lib/server/client";
import {ORDER_QUERY} from "@/graphql/queries";
import {UPDATE_ORDER_MUTATION} from "@/graphql/mutations";
import ClearCart from "@/components/menu/ClearCart";
import {useMutation} from "@apollo/client";

export default async function Page({
     params
 }: {
    params: { id: string }
}) {

    const { data } = await getClient().query({
        query: ORDER_QUERY,
        variables: {
            locale: 'FR',
            id: params.id
        },
        fetchPolicy: 'no-cache'
    });

    // query to update order status to success
    await getClient().mutate({
        mutation: UPDATE_ORDER_MUTATION,
        variables: {
            id: params.id,
            status: 'PAID'
        }
    })

    return (
        <main className="flex flex-col items-center justify-between p-24">
            <ClearCart />  {/* Just including this component will trigger the cart clear */}
            <h3>La commande {data.order.id} a été payée correctement!</h3>
            La commande est composée de:
            <ul>
                {data.order.products.map((item:any) => (
                    <li key={item.id}>{item.productTranslations[0].name} (x {item.pivot.quantity})</li>
                ))}
            </ul>

            <button className="py-6 bg-tsb-red-darker" >
                <a href="/">Go Home</a>
            </button>
        </main>
    );
}
