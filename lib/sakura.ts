/*!
 * Sakura.js 1.1.1
 * Vanilla JS version of jQuery-Sakura: Make it rain sakura petals.
 * https://github.com/jhammann/sakura
 *
 * Copyright 2019-2019 Jeroen Hammann
 *
 * Released under the MIT License
 *
 * Released on: September 4, 2019
 */
"use strict";

interface SakuraColor {
    gradientColorStart: string;
    gradientColorEnd: string;
    gradientColorDegree: number;
}

interface SakuraOptions {
    className: string;
    fallSpeed: number;
    maxSize: number;
    minSize: number;
    delay: number;
    colors: SakuraColor[];
}

class Sakura {
    el: HTMLElement;
    settings: SakuraOptions;

    constructor(selector: string, options: Partial<SakuraOptions> = {}) {
        if (typeof selector === 'undefined') {
            throw new Error('No selector present. Define an element.');
        }

        const el = document.querySelector<HTMLElement>(selector);
        if (!el) {
            throw new Error('The selector does not match any element.');
        }

        this.el = el;

        const defaults: SakuraOptions = {
            className: 'sakura',
            fallSpeed: 1,
            maxSize: 14,
            minSize: 10,
            delay: 300,
            colors: [{
                gradientColorStart: 'rgba(255, 183, 197, 0.9)',
                gradientColorEnd: 'rgba(255, 197, 208, 0.9)',
                gradientColorDegree: 120
            }]
        };

        // Merge defaults with user options
        this.settings = {...defaults, ...options};

        this.el.style.overflow = 'hidden';
        this.el.style.position = 'relative';

        this.createPetal = this.createPetal.bind(this);

        this.el.setAttribute('data-sakura-anim-id', window.requestAnimationFrame(this.createPetal).toString());
    }

    createPetal() {
        if (this.el.dataset.sakuraAnimId) {
            setTimeout(() => {
                window.requestAnimationFrame(this.createPetal);
            }, this.settings.delay);
        }

        const animationNames = {
            blowAnimations: ['blow-soft-left', 'blow-medium-left', 'blow-soft-right', 'blow-medium-right'],
            swayAnimations: ['sway-0', 'sway-1', 'sway-2', 'sway-3', 'sway-4', 'sway-5', 'sway-6', 'sway-7', 'sway-8']
        };

        const blowAnimation = this.randomArrayElem(animationNames.blowAnimations);
        const swayAnimation = this.randomArrayElem(animationNames.swayAnimations);

        const fallTime = (document.documentElement.clientHeight * 0.007 + Math.round(Math.random() * 5)) * this.settings.fallSpeed;

        const animationsArr = [
            `fall ${fallTime}s linear 0s 1`,
            `${blowAnimation} ${(fallTime > 30 ? fallTime : 30) - 20 + this.randomInt(0, 20)}s linear 0s infinite`,
            `${swayAnimation} ${this.randomInt(2, 4)}s linear 0s infinite`
        ];

        const animations = animationsArr.join(', ');

        const petal = document.createElement('div');
        petal.classList.add(this.settings.className);
        const height = this.randomInt(this.settings.minSize, this.settings.maxSize);
        const width = height - Math.floor(this.randomInt(0, this.settings.minSize) / 3);

        const color = this.randomArrayElem(this.settings.colors);
        petal.style.background = `linear-gradient(${color.gradientColorDegree}deg, ${color.gradientColorStart}, ${color.gradientColorEnd})`;
        petal.style.animation = animations;
        petal.style.borderRadius = `${this.randomInt(this.settings.maxSize, this.settings.maxSize + Math.floor(Math.random() * 10))}px ${this.randomInt(1, Math.floor(width / 4))}px`;
        petal.style.height = `${height}px`;
        petal.style.left = `${Math.random() * (document.documentElement.clientWidth - width)}px`;
        petal.style.top = `-${height}px`;  // Ensure the petal starts above the viewport
        petal.style.width = `${width}px`;
        petal.style.position = 'absolute';  // Ensure the petal is positioned absolutely
        petal.style.zIndex = '9999';  // Ensure the petal is on top of other elements

        this.prefixedEvent(petal, 'AnimationEnd', () => {
            if (!this.elementInViewport(petal)) {
                petal.remove();
            }
        });

        this.prefixedEvent(petal, 'AnimationIteration', () => {
            if (!this.elementInViewport(petal)) {
                petal.remove();
            }
        });

        this.el.appendChild(petal);
    }

    start() {
        const animId = this.el.dataset.sakuraAnimId;

        if (animId) {
            throw new Error('Sakura is already running.');
        }
        this.el.setAttribute('data-sakura-anim-id', window.requestAnimationFrame(this.createPetal).toString());
    }

    stop(graceful = false) {
        const animId = this.el.dataset.sakuraAnimId;

        if (animId) {
            window.cancelAnimationFrame(Number(animId));
            this.el.setAttribute('data-sakura-anim-id', '');
        }

        if (!graceful) {
            setTimeout(() => {
                const petals = document.getElementsByClassName(this.settings.className);

                while (petals.length > 0) {
                    const petal = petals[0]!;
                    if (petal.parentNode) {
                        petal.parentNode.removeChild(petal);
                    }
                }
            }, this.settings.delay + 50);
        }
    }

    private randomArrayElem<T>(arr: T[]): T {
        return arr[Math.floor(Math.random() * arr.length)]!;
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private prefixedEvent(element: HTMLElement, type: string, callback: EventListener) {
        const prefixes = ['webkit', 'moz', 'MS', 'o', ''];

        prefixes.forEach(prefix => {
            const animType = prefix ? prefix + type : type.toLowerCase();
            element.addEventListener(animType, callback, false);
        });
    }

    private elementInViewport(el: HTMLElement): boolean {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

export default Sakura;
