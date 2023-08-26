"use client";

import * as React from "react";
import {addToCart} from "@/store/slices/cartSlice";

interface ProductTagProps {
    tag: ProductTag;
}

const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const yOffset = -100;
    /* @ts-ignore */
    const y = el?.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({top: y + 75, behavior: 'smooth'});
}

const TagItem: React.FC<ProductTagProps> = ({ tag }) => {

    return (
        <li
            className="cursor-pointer hover:text-coralPink my-1"
            key={tag.id}
            onClick={() => scrollToSection(tag.id)}
        >
            {tag.productTagTranslations[0].name}
        </li>
    );
}

export default TagItem;
