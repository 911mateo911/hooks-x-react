import { useRef, useState, useEffect, useCallback } from 'react';

interface useCachedFetchResponseType<T> {
    data: T | undefined;
    loading: boolean;
    fetch?: (info: Request, useCache: boolean, mergeWithInitial?: boolean) => void;
}

interface CacheObj<T> {
    TTL: number;
    data: T;
}

export const useCachedFetch = <T>(info: Partial<Request>, lazy?: boolean): useCachedFetchResponseType<T> => {
    // TODO: fix double request on startup
    // TEST: lazy fetch

    const cache = useRef(new Map<Partial<Request>, CacheObj<T>>());
    const fetchParams = useRef<Partial<Request>>(info);
    const useFetchCache = useRef<boolean>(true);
    const [data, setData] = useState<T>();
    const [loading, setLoading] = useState<boolean>(!lazy);
    const [shouldFetch, setShouldFetch] = useState<boolean>(true);

    const fetcher = useCallback(async () => {
        try {
            setShouldFetch(false);
            setLoading(true);

            console.log(cache.current.has(fetchParams.current), cache.current)

            if (cache.current.has(fetchParams.current) && useFetchCache.current) return cache.current.get(fetchParams.current);

            const data = await fetch(fetchParams.current.url || '', fetchParams.current as Request);

            const response = await data.json() as T;

            setData(response);
            cache.current.set(fetchParams.current, {
                TTL: Date.now() + 3000, // some shit unix time here
                data: response
            })
        } catch (error) {
            console.error(error);
        } finally {
            // cache.current.forEach(({ TTL }, key, self) => {
            //     if (TTL > Date.now()) self.delete(key);
            // });
            console.log(cache.current)
            setLoading(false);
            setShouldFetch(true);
        }
    }, [])

    useEffect(() => {
        if (lazy) return;

        fetcher();
        // eslint-disable-next-line
    }, [lazy]);

    useEffect(() => {
        if (!shouldFetch) return;

        fetcher();
        // eslint-disable-next-line
    }, []);

    return {
        data,
        loading,
        ...(lazy && {
            fetch: (info, useCache = true, mergeConfigWithInitial = false) => {
                if (mergeConfigWithInitial) fetchParams.current = { ...fetchParams.current, ...info };
                else { fetchParams.current = info };

                useFetchCache.current = useCache;
                setShouldFetch(true);
            }
        })
    }
}
