"use client";

import { useState } from "react";

const MobileMenu: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden">
                <i className="fas fa-bars"></i>
            </button>

            {isOpen && (
                <div className="lg:hidden mt-4 space-y-2">
                    <a href="#" className="block text-gray-700 hover:text-black">Home</a>
                    <a href="#" className="block text-gray-700 hover:text-black">Menu</a>
                    <a href="#" className="block text-gray-700 hover:text-black">About Us</a>
                </div>
            )}
        </div>
    );
}

export default MobileMenu;
