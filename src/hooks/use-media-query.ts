import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  // Always start with false to ensure consistent server/client initial render
  // This prevents hydration mismatches
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    // Set the actual value after hydration
    setMatches(media.matches);
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
