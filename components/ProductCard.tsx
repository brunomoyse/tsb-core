// ProductCard.tsx

import React from 'react';
import Image from "next/image";
import dynamic from "next/dynamic";

import { formatPrice } from '@/utils/utils';

const ClientSideButton = dynamic(() => import('@/components/ClientSideButton'), { ssr: false }); // Import the client-side component

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product}) => {
    return (
        <div className="relative group rounded p-2 z-10">
            <div className="block border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition ease-in-out duration-200 cursor-pointer bg-gray-50">
                <div className="relative w-48 h-48 overflow-hidden mx-auto">
                    <Image
                        src={`/images/menu/${product.slug}.png`}
                        alt={product.productTranslations[0].name}
                        className="w-full h-full object-cover"
                        width={192}
                        height={192}
                    />
                </div>

                <div className="p-4">
                    <h2 className="text-lg font-bold mb-2">{product.productTranslations[0].name}</h2>
                    <p className="text-pink-600 font-semibold">{formatPrice(product.price)}</p>
                </div>
            </div>

            <div className="absolute inset-0 bg-pink-100 opacity-0 group-hover:opacity-50 transition-opacity z-5 pointer-events-none"></div>

            <ClientSideButton product={product} />
        </div>
    );
}

export default ProductCard;
