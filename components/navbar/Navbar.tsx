import React from "react";
import Link from 'next/link';
import dynamic from "next/dynamic";

const CartButton = dynamic(() =>
    import('@/components/navbar/CartButton'), {
        ssr: false,
        loading: () => <button
            type="button"
            className="flex items-center justify-center rounded-full h-9 w-36 text-offWhite font-semibold text-sm bg-coralPink hover:bg-coralPink-darker"
        >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="mr-2 h-5 w-5 fill-current">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z"></path>
            </svg>
            <div>Panier</div>
        </button>
});

import ConnectButton from "./ConnectButton";
import MobileMenu from "./MobileMenu";

const Navbar: React.FC = () => {
    return (
        <nav className="bg-offWhite p-4 shadow-md text-charcoal">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="text-xl font-bold">
                    <Link href="/" className="text-charcoal hover:text-coralPink">
                        Tokyo Sushi
                    </Link>
                </div>
                <div className="flex-grow flex justify-center hidden lg:flex space-x-4 mx-auto">
                    {/*
                    <Link href="/menu" className="text-charcoal hover:text-coralPink">
                        MENU
                    </Link>
                    */}

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
