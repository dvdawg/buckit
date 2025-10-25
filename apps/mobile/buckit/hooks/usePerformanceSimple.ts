import { useState, useEffect } from 'react';
import { useSession } from './useSession';

type PerformanceData = {
  overallProgress: number;
  currentStreak: number;
  growthRate: number;
  totalCompletions: number;
  activeBuckets: number;
  weeklyProgress: Array<{
    week: string;
    completed: number;
  }>;
  bucketProgress: Array<{
    bucket: string;
    completion: number;
  }>;
};

export function usePerformanceSimple() {
  const { user } = useSession();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { 
      setPerformance(null); 
      setLoading(false); 
      return; 
    }
    
    // Simulate loading delay
    setTimeout(() => {
      setPerformance({
        overallProgress: 0.56, // 56%
        currentStreak: 5,
        growthRate: 250,
        totalCompletions: 14,
        activeBuckets: 4,
        weeklyProgress: [
          { week: "Week 1", completed: 4 },
          { week: "Week 2", completed: 7 },
          { week: "Week 3", completed: 10 },
          { week: "Week 4", completed: 14 },
        ],
        bucketProgress: [
          { bucket: "Outdoors", completion: 0.8 },
          { bucket: "Family", completion: 0.65 },
          { bucket: "Food", completion: 0.5 },
          { bucket: "Travel", completion: 0.3 },
        ]
      });
      setLoading(false);
    }, 1000);
  }, [user]);

  return { performance, loading };
}
