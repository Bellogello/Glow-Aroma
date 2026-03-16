import { useEffect } from 'react';

const useTitle = (title) => {
  useEffect(() => {
    document.title = `${title} | Glow Aroma`;
  }, [title]);
};

export default useTitle;