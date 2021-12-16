import { useEffect, useRef, useState } from 'react';

export const useDebounceGetScreenResize = (debounce = 500, cb?: () => void) => {
    // save screen width on state
    const [screenWidth, setScreenWidth] = useState<number>(window?.innerWidth || 0);

    const screenResizeHandler = useRef((function () {
        // IIFE that returns a closure to keep track of the timeout
        let timeout: NodeJS.Timeout | null = null;

        const resetTimeout = () => timeout && clearTimeout(timeout);
        const addTimeout = () => {
            timeout = setTimeout(() => {
                setScreenWidth(window.innerWidth);
                // call callback if present
                cb && cb();
            }, debounce);
        };

        // return helper fns
        return { resetTimeout, addTimeout };
    })());

    useEffect(() => {
        // if SSR
        if (!window) return;

        const { resetTimeout, addTimeout } = screenResizeHandler.current;

        const hndlr = () => {
            // reset last timeout
            resetTimeout();
            // add first one
            addTimeout();
        }
        // add to window resize 
        window.addEventListener('resize', hndlr);

        // detach listener
        return () => window.removeEventListener('resize', hndlr);
    }, []);

    // if SSR
    if (!window) return [0];

    return [screenWidth];
}
