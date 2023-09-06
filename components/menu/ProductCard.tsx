import * as React from 'react';
import Image from "next/image";
import { formatPrice } from "@/utils/utils";
import dynamic from "next/dynamic";
const ClientSideButton = dynamic(() =>
    import('@/components/buttons/AddProductButton'), {
        ssr: false,
        loading: () => <div className="text-tsb-gray hover:text-tsb-red-lighter cursor-pointer flex justify-center mb-2 underline underline-offset-8 decoration-tsb-red">
            <span>ajouter</span>
        </div>
    }
);

import {addToCart} from "@/store/slices/cartSlice";

interface ProductCardProps {
    product: Product;
    priority?: boolean
}

const ProductCard: React.FC<ProductCardProps> = ({ product, priority=false }) => {
    return (
        <div className="rounded-3xl bg-white pb-4">
            <div className="flex justify-center relative h-40 rounded-t-2xl ">
                <Image
                    alt={product.productTranslations[0].name}
                    src={`/images/compressed/${product.slug}-200.png`}
                    width={190}
                    height={160}
                    className="hover:scale-105 duration-700 cursor-pointer"
                    style={{objectFit: "contain"}}
                    draggable={false}
                    priority={priority}
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
