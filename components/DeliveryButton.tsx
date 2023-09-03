'use client';

import {motion} from "framer-motion";
import React from "react";
import Link from "next/link";

const DeliveryButton = () => {

    return (
        <motion.div
            initial={({ y: 30, opacity: 0 })}
            animate={{ y: 0, opacity: 1}}
            transition={{ ease: "easeOut", duration: 1, delay: 0.7 }}
        >
            <button
                className="px-8 lg:text-2xl md:text-xl rounded-2xl h-16 text-tsb-gray font-semibold  bg-white border-tsb-red border-2 transition-all duration-300 shadow-md hover:shadow-lg hover:text-white hover:bg-tsb-red transform hover:-translate-y-1"
            >
                <Link href="/menu">
                    LIVRAISON
                </Link>
            </button>
        </motion.div>
    );
}

export default DeliveryButton;
