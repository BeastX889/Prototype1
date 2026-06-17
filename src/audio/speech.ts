import * as Speech from 'expo-speech';

/**
 * Text-to-speech for round announcements and the combo caller. Works on web
 * (Web Speech API) and native. There is no native priority queue, so we
 * implement one rule here: announcements interrupt whatever is speaking;
 * combos defer (skip) if something is already being spoken. Never throws —
 * speech must not be able to crash the timer.
 */

let speaking = false;

interface SayOptions {
  /** Announcements interrupt; combos pass false and yield to in-progress speech. */
  interrupt?: boolean;
}

export function say(text: string, { interrupt = false }: SayOptions = {}): void {
  try {
    if (interrupt) {
      Speech.stop();
    } else if (speaking) {
      return; // a combo defers to whatever is already speaking
    }
    speaking = true;
    Speech.speak(text, {
      rate: 1.0,
      onDone: () => {
        speaking = false;
      },
      onStopped: () => {
        speaking = false;
      },
      onError: () => {
        speaking = false;
      },
    });
  } catch {
    speaking = false;
  }
}

export function stopSpeech(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  speaking = false;
}
