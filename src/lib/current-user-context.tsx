import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context-with-msal';
import { User } from './cosmos-db';

interface CurrentUserContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextType>({
  currentUser: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
});

export const CurrentUserProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrCreateUser = async (userId: string) => {
    try {
      // First, try to fetch the existing user
      const response = await fetch(`/api/users/${userId}`);
      
      if (response.status === 404) {
        // User doesn't exist, create a new one
        const createResponse = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: authUser.email || authUser.name,
            avatarUri: null,
            fastenConnections: [],
          }),
        });
        
        if (!createResponse.ok) {
          throw new Error('Failed to create user record');
        }
        
        return await createResponse.json();
      } else if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in fetchOrCreateUser:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!authUser?.id || !isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userData = await fetchOrCreateUser(authUser.id);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !authUser?.id) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    refreshUser();
  }, [authUser?.id, isAuthenticated, authLoading]);

  return (
    <CurrentUserContext.Provider value={{
      currentUser,
      loading: loading || authLoading,
      error,
      refreshUser,
    }}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUser = () => useContext(CurrentUserContext); 