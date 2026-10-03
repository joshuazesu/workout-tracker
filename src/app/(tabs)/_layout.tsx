import { PagerTabs } from '@/components/pager-tabs';

// Order is left to right; swipe between them or tap the bar. The app opens on Workout because
// "/" resolves to (start)/index.
export default function TabLayout() {
  return (
    <PagerTabs initialRouteName="(start)">
      <PagerTabs.Screen name="profile" />
      <PagerTabs.Screen name="history" />
      <PagerTabs.Screen name="(start)" />
      <PagerTabs.Screen name="exercises" />
      <PagerTabs.Screen name="challenges" />
    </PagerTabs>
  );
}
