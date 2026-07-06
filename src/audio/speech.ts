import * as Speech from 'expo-speech';

/**
 * Text-to-speech for round announcements and the combo caller. Works on web
 * (Web Speech API) and native. There is no native priority queue, so we
 * implement one rule here: announcements interrupt whatever is speaking;
 * combos defer (skip) if something is already being spoken. Never throws —
 * speech must not be able to crash the timer.
 */

let speaking = false;
// Each utterance gets an id; stale callbacks (e.g. the onStopped of an
// utterance we just interrupted) must not clear the flag for the new one.
let utterId = 0;

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
    const id = ++utterId;
    speaking = true;
    const clear = () => {
      if (id === utterId) speaking = false;
    };
    Speech.speak(text, {
      rate: 1.0,
      onDone: clear,
      onStopped: clear,
      onError: clear,
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
  utterId++;
  speaking = false;
}
