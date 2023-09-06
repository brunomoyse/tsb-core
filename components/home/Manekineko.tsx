'use client';

import {motion} from "framer-motion";
import React from "react";
import Image from "next/image";

const Manekineko = () => {

    return (
        <motion.div
            initial={({ x: -350 })}
            animate={{ x: 0 }}
            transition={{ ease: "easeOut", duration: 0.8 }}
        >
            <Image
                src="/images/maneki-neko-3.png"
                alt="Tokyo Sushi Bar maneki neko"
                width={500}
                height={500}
                draggable={false}
            />
        </motion.div>
    );
}

export default Manekineko;
