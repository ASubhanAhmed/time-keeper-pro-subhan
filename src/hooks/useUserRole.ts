import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'admin' | 'user' | null;

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    if (authLoading) {
      setLoading(true);
      return () => {
        isActive = false;
      };
    }

    if (!user) {
      setRole(null);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) {
          setRole('user');
          setLoading(false);
          return;
        }

        setRole((data?.role as AppRole) ?? 'user');
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authLoading, user?.id]);

  return {
    role,
    isAdmin: role === 'admin',
    loading,
  };
}