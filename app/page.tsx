"use client";

"use client";

import React, { useEffect } from 'react';

const Home: React.FC = () => {
    useEffect(() => {
        const parallaxLayers = Array.from(document.querySelectorAll('.parallax-layer'));
        const contentHeight = document.querySelector('.content').clientHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = contentHeight - viewportHeight;

        const handleScroll = () => {
            const scrolled = window.scrollY;
            parallaxLayers.forEach((layer: Element) => {
                // @ts-ignore
                const speed = parseFloat(layer.getAttribute('data-speed'));
                let yPos;
                yPos = -(scrolled * speed * maxScroll / 100);
                layer.style.backgroundPositionY = `${yPos}px`;
            });
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="parallax">
            <div className="parallax-layer" data-speed="0.6" style={{ backgroundImage: 'url(/images/parallax/sky.webp)' }}></div>
            <div className="parallax-layer" data-speed="0.1" style={{ backgroundImage: 'url(/images/parallax/water.webp)' }}></div>
            <div className="parallax-layer" data-speed="0.4" style={{ backgroundImage: 'url(/images/parallax/trees.webp)' }}></div>
            <div className="parallax-layer" data-speed="0.1" style={{ backgroundImage: 'url(/images/parallax/rock.webp)' }}></div>
            <div className="content">
                <div style={{ minHeight: '150vh' }}>
                </div>
            </div>
        </div>
    );
}

export default Home;
