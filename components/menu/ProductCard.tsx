/* ProductCard.tsx */
import * as React from 'react';
import Image from "next/image";
import { formatPrice } from "@/lib/utils/utils";
import dynamic from "next/dynamic";
import {addToCart} from "@/store/slices/cartSlice";

const ClientSideButton = dynamic(() =>
    import('@/components/buttons/AddProductButton'), {
        ssr: false,
        loading: () => <div className="text-tsb-gray hover:text-tsb-red-lighter cursor-pointer flex justify-center mb-2 underline underline-offset-8 decoration-tsb-red">
            <span>ajouter</span>
        </div>
    }
);
const ProductImageWrapper = dynamic(() =>
        import('@/components/menu/ProductImageWrapper'), {
        ssr: false
    }
);

interface ProductCardProps {
    product: Product;
    priority?: boolean
}



const ProductCard: React.FC<ProductCardProps> = ({ product, priority=false }) => {


    return (
        <div className="rounded-3xl bg-white pb-4">
            <div className="flex justify-center relative h-40 rounded-t-2xl">
                <ProductImageWrapper product={product} />
                <picture className="hover:scale-105 duration-700 p-6 pb-8">
                    <source srcSet={`${process.env.AWS_S3_BUCKET_ENDPOINT!}/images/thumbnails/${product?.preview?.path}.avif`} type="image/avif" />
                    <source srcSet={`${process.env.AWS_S3_BUCKET_ENDPOINT!}/images/thumbnails/${product?.preview?.path}.webp`} type="image/webp" />
                    <img
                        src={`${process.env.AWS_S3_BUCKET_ENDPOINT!}/images/thumbnails/${product?.preview?.path}.png`}
                        alt={product.productTranslations[0].name}
                        draggable={false}
                        style={{ height: '100%', objectFit: 'contain' }}
                        fetchPriority={priority ? 'high' : 'low'}
                    />
                </picture>
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
