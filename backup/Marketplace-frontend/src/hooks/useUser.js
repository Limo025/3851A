import { useState, useEffect } from 'react';
import {getAuth, onAuthStateChanged} from 'firebase/auth';

const useUser = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubcribe = onAuthStateChanged(getAuth(), user => {
            setUser(user);
            setIsLoading(false);
        });

        return unsubcribe;
    }, [])

    return { user, isLoading};
}

export default useUser;