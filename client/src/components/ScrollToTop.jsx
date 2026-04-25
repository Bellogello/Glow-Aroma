import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instantly scrolls to the top-left corner whenever the URL changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null; // This component is invisible
};

export default ScrollToTop;