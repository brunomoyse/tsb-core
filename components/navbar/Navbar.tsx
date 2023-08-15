import dynamic from "next/dynamic";
const CartButton = dynamic(() => import('@/components/navbar/CartButton'), { ssr: false });

import ConnectButton from "./ConnectButton";
import MobileMenu from "./MobileMenu";



const Navbar: React.FC = () => {
    return (
        <nav className="bg-offWhite p-4 shadow-md text-charcoal">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="text-xl font-bold">Tokyo Sushi Bar</div>
                <div className="flex items-center space-x-2">
                    <div className="hidden lg:flex space-x-4 mx-auto">
                        <a href="#" className="text-charcoal hover:text-coralPink">Home</a>
                        <a href="#" className="text-charcoal hover:text-coralPink">Menu</a>
                        <a href="#" className="text-charcoal hover:text-coralPink">About Us</a>
                    </div>
                    <CartButton />
                    <ConnectButton />
                    <MobileMenu />
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
