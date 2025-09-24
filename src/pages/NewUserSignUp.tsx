import { NewUserSignUp } from "@/components/NewUserSignUp";
import { useEffect } from "react";

export default function NewUserSignUpPage() {
  useEffect(() => {
    // Add meta tags to prevent indexing
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow, noarchive, nosnippet';
    document.head.appendChild(metaRobots);

    const metaGooglebot = document.createElement('meta');
    metaGooglebot.name = 'googlebot';
    metaGooglebot.content = 'noindex, nofollow, noarchive, nosnippet';
    document.head.appendChild(metaGooglebot);

    const metaBingbot = document.createElement('meta');
    metaBingbot.name = 'bingbot';
    metaBingbot.content = 'noindex, nofollow, noarchive, nosnippet';
    document.head.appendChild(metaBingbot);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(metaRobots);
      document.head.removeChild(metaGooglebot);
      document.head.removeChild(metaBingbot);
    };
  }, []);

  return <NewUserSignUp />;
}
