import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useScrollNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a scroll target in the state
    if (location.state?.scrollTo) {
      setTimeout(() => {
        const element = document.getElementById(location.state.scrollTo);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100); // Delay to allow the page to render
    }
  }, [location]);

  const navigateAndScroll = (path, elementId) => {
    if (location.pathname === path) {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(path, { state: { scrollTo: elementId } });
    }
  };

  return { navigateAndScroll };
};