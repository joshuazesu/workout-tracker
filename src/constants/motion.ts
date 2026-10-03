import { cubicBezier, Easing } from 'react-native-reanimated';

/** Strong ease-out for anything entering, exiting or responding to a press. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** EASE_OUT in the form CSS transitions (`transitionTimingFunction`) take. */
export const EASE_OUT_CSS = cubicBezier(0.23, 1, 0.32, 1);

/** The iOS sheet curve: fast start, long soft landing. */
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);
