import * as React from 'react';
import Image from "next/image";
import { formatPrice } from "@/utils/utils";
import dynamic from "next/dynamic";
const ClientSideButton = dynamic(() =>
    import('@/components/ClientSideButton'), {
        ssr: false,
        loading: () => <div>ajouter</div>
    }
);

import {addToCart} from "@/store/slices/cartSlice";

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    console.log(product)
    return (
        <div className="rounded-3xl border-tsb-gray-lighter border-2 bg-white p-4 pb-6">
            <div className="flex justify-center relative h-40 rounded-t-2xl ">
                <Image
                    alt={product.productTranslations[0].name}
                    src={`/images/compressed/${product.slug}-360.png`}
                    fill={true}
                    className="hover:scale-105 duration-700 cursor-pointer"
                    style={{objectFit: "contain"}}
                    draggable={false}
                />
            </div>
            <div className="mt-2">
                <span className={`${product.productTranslations[0].name.length > 10 ? 'tracking-tight' : 'tracking-wider'} flex justify-center mb-2 text-black`}>{
                    product.productTranslations[0].name.toUpperCase()
                }</span>
                <span className="flex justify-center text-tsb-red-darker mb-1">{formatPrice(product.price)}</span>
                <span
                    className="cursor-pointer flex justify-center text-gray-400 mb-2 underline underline-offset-8 decoration-tsb-red"
                >
                    <ClientSideButton product={product} />
                </span>
            </div>
        </div>
    );
}

export default ProductCard;
