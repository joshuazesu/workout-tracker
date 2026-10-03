import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ChallengeCard } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Section } from '@/components/list';
import { CompactTitle, ScreenHeader, useCollapsingTitle } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { CHALLENGES, type ChallengeId, challengeProgress, useWorkoutStore } from '@/lib/workouts';

const LADDER: ChallengeId[] = ['kickstart', 'builder', 'habit'];

/** "3 days in a week", "12 days in 30 days" */
function goal(id: ChallengeId) {
  const { days, windowDays } = CHALLENGES[id];
  const window = windowDays === 7 ? 'a week' : windowDays % 7 === 0 ? `${windowDays / 7} weeks` : `${windowDays} days`;
  return `${days} days in ${window}`;
}

const shortDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function ChallengesScreen() {
  const theme = useTheme();
  const { history, challenge, trophies } = useWorkoutStore();
  const now = useNow();
  const collapse = useCollapsingTitle();

  const progress = challenge && !challenge.completedAt ? challengeProgress(challenge, history, now) : null;
  // The trophy being worked towards, shown as a dashed "still to win" card.
  const chasing = progress && !progress.expired ? progress : null;
  // The challenge offered next, as ChallengeCard offers it.
  const lastTrophy = trophies.at(-1);
  const upNext = challenge?.completedAt
    ? CHALLENGES[challenge.id].next
    : !challenge
      ? lastTrophy
        ? CHALLENGES[lastTrophy.id].next
        : 'kickstart'
      : null;

  const subtitle = [
    trophies.length > 0 ? `${trophies.length} ${trophies.length === 1 ? 'trophy' : 'trophies'}` : '',
    chasing ? `${chasing.done} of ${chasing.days} days this round` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Animated.ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        onScroll={collapse.onScroll}
        scrollEventThrottle={16}>
        <ScreenHeader title="Challenges" subtitle={subtitle || undefined} collapse={collapse} />

        <ChallengeCard />

        <Section title="The ladder">
          {LADDER.map((id, i) => {
            const earned = trophies.filter((t) => t.id === id);
            const current = challenge && !challenge.completedAt && challenge.id === id ? progress : null;
            const status = current
              ? current.expired
                ? `Ended · ${current.done} of ${current.days} days`
                : 'In progress'
              : earned.length > 0
                ? `Done ${shortDate(earned.at(-1)!.completedAt)}${earned.length > 1 ? ` · ×${earned.length}` : ''}`
                : id === upNext
                  ? 'Up next'
                  : i > 0
                    ? `After ${CHALLENGES[LADDER[i - 1]].title}`
                    : 'Not started';
            const locked = !current && earned.length === 0 && id !== upNext;
            return (
              <View key={id} style={styles.rung}>
                {current ? (
                  <View style={[styles.marker, { borderWidth: 2, borderColor: theme.accent }]}>
                    <ThemedText type="caption" themeColor="accent" numeric>
                      {current.done}/{current.days}
                    </ThemedText>
                  </View>
                ) : earned.length > 0 ? (
                  <View style={[styles.marker, { backgroundColor: theme.text }]}>
                    <Icon name={{ ios: 'checkmark', md: 'check' }} size={16} color={theme.onText} weight="bold" />
                  </View>
                ) : (
                  <View style={[styles.marker, { borderWidth: 1, borderColor: theme.outline }]}>
                    {locked && <Icon name={{ ios: 'lock', md: 'lock' }} size={14} color={theme.textSecondary} />}
                  </View>
                )}
                <View style={styles.flex}>
                  <ThemedText type="headline" themeColor={locked ? 'textSecondary' : 'text'}>
                    {CHALLENGES[id].title}
                  </ThemedText>
                  <ThemedText type="subheadline" themeColor="textSecondary">
                    {goal(id)} · {status}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </Section>

        <Section title="Trophies" padded>
          <View style={styles.trophies}>
            {trophies.map((t, i) => (
              <View
                key={i}
                style={[styles.trophy, { backgroundColor: theme.surface, borderColor: theme.separator }]}>
                <Icon name={{ ios: 'trophy.fill', md: 'trophy' }} size={28} color={theme.accent} />
                <ThemedText type="headline" style={styles.trophyTitle}>
                  {CHALLENGES[t.id].title}
                </ThemedText>
                <ThemedText type="footnote" themeColor="textSecondary">
                  {shortDate(t.completedAt)}
                </ThemedText>
              </View>
            ))}
            {chasing && (
              <View style={[styles.trophy, styles.locked, { borderColor: theme.outline }]}>
                <Icon name={{ ios: 'trophy', md: 'trophy' }} size={28} color={theme.outline} />
                <ThemedText type="headline" themeColor="textSecondary" style={styles.trophyTitle}>
                  {chasing.title}
                </ThemedText>
                <ThemedText type="footnote" themeColor="textSecondary">
                  {chasing.days - chasing.done} {chasing.days - chasing.done === 1 ? 'day' : 'days'} to go
                </ThemedText>
              </View>
            )}
          </View>
          {trophies.length === 0 && !chasing && (
            <ThemedText type="subheadline" themeColor="textSecondary">
              Finish a challenge to earn your first trophy.
            </ThemedText>
          )}
        </Section>
      </Animated.ScrollView>
      <CompactTitle title="Challenges" collapse={collapse} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Gutter,
    paddingBottom: Spacing.five,
    gap: Spacing.four + 2,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  rung: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
    paddingVertical: Spacing.three - 2,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trophy: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius,
    borderWidth: 1,
    padding: Spacing.three - 2,
    gap: Spacing.two,
  },
  locked: {
    borderStyle: 'dashed',
  },
  trophyTitle: {
    fontWeight: 700,
  },
});
