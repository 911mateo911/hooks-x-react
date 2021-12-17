import { useRef, useState, useEffect, useCallback } from 'react';

interface useCachedFetchResponseType<T> {
    data: T | undefined;
    loading: boolean;
    fetch?: (info?: lazyFetchProps) => void;
}

interface lazyFetchProps extends Partial<Request> {
    useCache?: boolean,
    mergeConfigWithInitial?: boolean
}

interface useCachedFetchProps {
    cacheTTL?: number;
    errorCb?: (error: Error | unknown) => void;
    lazy?: boolean
}

interface CacheObj<T> {
    TTL: number;
    data: T;
}

const getUnixTime = () => Math.round((new Date()).getTime() / 1000);

export const useCachedFetch = <T>(
    info: Partial<Request>,
    {
        cacheTTL = 120,
        errorCb,
        lazy = false
    }: useCachedFetchProps
): useCachedFetchResponseType<T> => {
    // map of all the Request object that you have sent
    const cache = useRef(new Map<string, CacheObj<T>>());
    // your current fetch params
    const fetchParams = useRef<Partial<Request>>(info);
    // used by lazy fetch if you want to use the cache
    const useFetchCache = useRef<boolean>(true);
    // current api data
    const [data, setData] = useState<T>();
    // request loading
    const [loading, setLoading] = useState<boolean>(false);

    const fetcher = useCallback(async () => {
        try {
            // check cache and return if found response
            if (
                cache.current.has(JSON.stringify(fetchParams.current))
                && useFetchCache.current &&
                // make sure the cache is not stale / has passed ttl till last call
                Number(cache.current.get(JSON.stringify(fetchParams.current))?.TTL) > getUnixTime()
            ) return setData(cache.current.get(JSON.stringify(fetchParams.current))?.data);

            setLoading(true);

            const data = await fetch(fetchParams.current.url || '', fetchParams.current as Request);

            // get the response
            const response = await data.json() as T;

            // update component
            setData(response);
            // add to cache
            cache.current.set(JSON.stringify(fetchParams.current), {
                TTL: getUnixTime() + cacheTTL, // some unix time here, because "javascript"
                data: response
            })
        } catch (error) {
            errorCb ? errorCb(error) : console.error(error);
        } finally {
            // hydrate the cache;
            cache.current.forEach(({ TTL }, key, self) => {
                if (TTL < getUnixTime()) self.delete(key);
            });
            setLoading(false);
        }
    }, [cacheTTL, errorCb]);

    useEffect(() => {
        // keep fetchParams updated
        fetchParams.current = info;
    }, [info]);

    useEffect(() => {
        fetcher();
    }, [fetcher]);

    return {
        data,
        loading,
        ...(lazy && {
            fetch: ({ mergeConfigWithInitial = true, useCache = true } = {} as lazyFetchProps) => {
                if (mergeConfigWithInitial) fetchParams.current = { ...fetchParams.current, ...info };
                else { fetchParams.current = info };

                useFetchCache.current = useCache;
                fetcher()
            }
        })
    }
}
