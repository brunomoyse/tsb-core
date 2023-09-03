import React from "react";
import Link from 'next/link';
import dynamic from "next/dynamic";

const CartButton = dynamic(() =>
    import('@/components/navbar/CartButton'), {
        ssr: false,
    loading: () => <div className="h-9 w-36"></div>
    /*
      loading: () =>
      <button
        type="button"
        className="flex items-center justify-center rounded-full h-9 w-36 text-off-white font-semibold text-sm bg-tsb-red hover:bg-tsb-red-darker"
      >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="mr-2 h-5 w-5 fill-current">
              <path fillRule="evenodd" clipRule="evenodd" d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z"></path>
          </svg>
        <div>Panier</div>
    </button>
    */

});

import ConnectButton from "./ConnectButton";
import MobileMenu from "./MobileMenu";

const Navbar: React.FC = () => {
    return (
        <nav className="bg-tsb-gray shadow-xl text-off-white fixed z-50 h-20 w-full">
            <div className="container px-8 flex justify-between items-center h-full mx-auto">
                <div className="text-xl font-bold flex items-center">
                    <Link href="/" className="text-charcoal hover:text-tsb-red">
                        <h1 className="font-['Channel']">
                            <span>Tokyo</span>
                            <span className="text-sm">Sushi Bar</span>
                        </h1>
                    </Link>
                </div>
                <div className="flex items-center space-x-2">  {/* Added items-center here */}
                    <CartButton />
                    {/*<ConnectButton />*/}
                    <MobileMenu />
                </div>
            </div>
        </nav>

    );
}

export default Navbar;
