import React from "react";
import Link from 'next/link';
import dynamic from "next/dynamic";
const CartButton = dynamic(() => import('@/components/navbar/CartButton'), { ssr: false });

import ConnectButton from "./ConnectButton";
import MobileMenu from "./MobileMenu";

const Navbar: React.FC = () => {
    return (
        <nav className="bg-offWhite p-4 shadow-md text-charcoal">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="text-xl font-bold">Tokyo Sushi Bar</div>
                <div className="flex-grow flex justify-center hidden lg:flex space-x-4 mx-auto">
                    <Link href="/" className="text-charcoal hover:text-coralPink">
                        Home
                    </Link>
                    <Link href="/menu" className="text-charcoal hover:text-coralPink">
                        Menu
                    </Link>
                    <Link href="/about-us" className="text-charcoal hover:text-coralPink">
                        About Us
                    </Link>
                </div>
                <div className="flex items-end space-x-2">
                    <CartButton />
                    {/*<ConnectButton />*/}
                    <MobileMenu />
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
