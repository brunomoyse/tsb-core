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
    return (
        <div className="bg-white rounded-3xl pb-4">
            <div className="flex justify-center relative h-40">
                <Image
                    alt={product.productTranslations[0].name}
                    src={`/images/menu/${product.slug}.png`}
                    fill={true}
                    className="rounded-t-3xl hover:scale-125 duration-300 cursor-pointer"
                    style={{objectFit: "contain"}}
                    draggable={false}
                />
            </div>
            <div className="mt-2">
                <span className="flex justify-center mb-2 tracking-wide">{ product.productTranslations[0].name.toUpperCase() }</span>
                <span className="flex justify-center text-coralPink mb-1">{formatPrice(product.price)}</span>
                <span
                    className="cursor-pointer flex justify-center text-gray-400 mb-2 underline underline-offset-8 decoration-coralPink"
                >
                    <ClientSideButton product={product} />
                </span>
            </div>
        </div>
    );
}

export default ProductCard;
