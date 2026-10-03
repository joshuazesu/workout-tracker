import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { feedback } from '@/lib/feedback';
import { accountActions } from '@/lib/sync';

type Step = 'welcome' | 'email' | 'code' | 'loading';

/** A text style for a TextInput. iOS clips the bottom of the text when a line height is set. */
const inputText = (type: 'title1' | 'title3') => ({ ...textStyle(type), lineHeight: undefined });

const looksLikeEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);

/** Plain-language versions of the errors people actually hit. */
function describe(error: unknown, step: Step): string {
  const e = error as { status?: number; name?: string; message?: string };
  if (e?.status === 429) return 'Too many attempts. Wait a minute, then try again.';
  if (e?.name === 'AuthRetryableFetchError' || e?.message?.includes('Network request failed') || e?.message?.includes('Failed to fetch')) {
    return 'Couldn’t reach the server. Check your connection and try again.';
  }
  if (step === 'code' && e?.name === 'AuthApiError') return 'That code is wrong or has expired.';
  if (step === 'loading') return 'Couldn’t load your workouts. Check your connection and try again.';
  return e?.message || 'Something went wrong. Please try again.';
}

export default function SignInScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** `errorStep` says which step a failure belongs to, so its message fits. */
  const run = async (task: () => Promise<void>, errorStep: (e: unknown) => Step) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(describe(e, errorStep(e)));
    } finally {
      setBusy(false);
    }
  };

  // Auth errors are about the email or code; anything after that is loading the account.
  const isAuthError = (e: unknown) => Boolean((e as { name?: string })?.name?.startsWith('Auth'));

  const sendCode = () =>
    run(async () => {
      await accountActions.sendCode(email.trim());
      feedback.tap();
      setCode('');
      setStep('code');
    }, () => 'email');

  // Once the code checks out, the account's data loads; the app opens as soon as it's in.
  const verify = () =>
    run(
      async () => {
        try {
          await accountActions.verifyCode(email.trim(), code);
        } catch (e) {
          if (!isAuthError(e)) setStep('loading');
          throw e;
        }
      },
      (e) => (isAuthError(e) ? 'code' : 'loading')
    );

  const retryLoad = () => run(() => accountActions.finishSignIn(), () => 'loading');

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.text }];

  if (step === 'welcome') {
    return (
      <Pressable
        onPress={() => {
          feedback.tap();
          setStep('email');
        }}
        accessibilityRole="button"
        accessibilityLabel="LogMyLift. Tap to continue"
        style={styles.flex}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundPlain }]}>
          <Animated.View exiting={FadeOut.duration(150)} style={[styles.body, styles.welcome]}>
            <ThemedText type="display">LogMyLift</ThemedText>
          </Animated.View>
          <ThemedText type="subheadline" themeColor="textSecondary" style={styles.hint}>
            Tap to continue
          </ThemedText>
        </SafeAreaView>
      </Pressable>
    );
  }

  const content = {
    email: {
      icon: { ios: 'person.crop.circle', md: 'account_circle' } as const,
      title: 'Sign in to\nyour logbook',
      body: 'We’ll email you a sign-in code. New here? The same code creates your account.',
      field: (
        <TextInput
          value={email}
          // Wraps instead of scrolling sideways, so a long address stays fully in view. Return still sends.
          onChangeText={(v) => setEmail(v.replace(/\s/g, ''))}
          multiline
          scrollEnabled={false}
          submitBehavior="blurAndSubmit"
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => looksLikeEmail(email.trim()) && sendCode()}
          accessibilityLabel="Email address"
          autoFocus
          style={[inputStyle, inputText('title3')]}
        />
      ),
      actions: (
        <Button
          label={busy ? 'Sending…' : 'Send Code'}
          onPress={sendCode}
          disabled={busy || !looksLikeEmail(email.trim())}
        />
      ),
    },
    welcome: {
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    paddingBottom: Spacing.three,
  },
  code: {
      icon: { ios: 'envelope.badge', md: 'mark_email_unread' } as const,
      title: 'Check your email',
      body: `Enter the code we sent to ${email.trim()}.`,
      field: (
        <TextInput
          value={code}
          // Multiline like the email field: iOS draws a single-line placeholder in this font too high.
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          multiline
          scrollEnabled={false}
          submitBehavior="blurAndSubmit"
          placeholder="Code"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={() => code.length >= 6 && verify()}
          accessibilityLabel="Sign-in code"
          autoFocus
          style={[inputStyle, styles.code, inputText('title1')]}
        />
      ),
      actions: (
        <>
          <Button label={busy ? 'Checking…' : 'Continue'} onPress={verify} disabled={busy || code.length < 6} />
          <View style={styles.links}>
            <Button label="Resend code" variant="plain" size="small" onPress={sendCode} disabled={busy} />
            <Button
              label="Different email"
              variant="plain"
              size="small"
              onPress={() => {
                setError(null);
                setStep('email');
              }}
              disabled={busy}
            />
          </View>
        </>
      ),
    },
    loading: {
      icon: { ios: 'icloud.and.arrow.down', md: 'cloud_download' } as const,
      title: 'Loading your\nworkouts',
      body: 'You’re signed in. Fetching your templates and history.',
      field: null,
      actions: <Button label={busy ? 'Loading…' : 'Try Again'} onPress={retryLoad} disabled={busy} />,
    },
  }[step];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundPlain }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View key={step} entering={FadeInDown.duration(250)} exiting={FadeOut.duration(150)} style={styles.body}>
          <Icon name={content.icon} size={56} color={theme.accent} />
          <ThemedText type="largeTitle">{content.title}</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            {content.body}
          </ThemedText>
          {content.field}
          {error && (
            <ThemedText type="subheadline" style={{ color: theme.destructive }} accessibilityRole="alert">
              {error}
            </ThemedText>
          )}
        </Animated.View>
        <View style={styles.footer}>{content.actions}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    minWidth: 0,
    paddingVertical: Spacing.two,
    borderBottomWidth: 2,
  },
  welcome: {
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    paddingBottom: Spacing.three,
  },
  code: {
    letterSpacing: 6,
  },
  footer: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
