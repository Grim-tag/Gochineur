import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const AnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Initialize Google Analytics with the user's Measurement ID
        ReactGA.initialize("G-JYGK8NJJ8X");
    }, []);

    useEffect(() => {
        // Send pageview with a custom path
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }, [location]);

    return null;
};

export default AnalyticsTracker;
