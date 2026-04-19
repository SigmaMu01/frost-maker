import { WritableSignal } from '@angular/core';

export function toggleFlag(flag: WritableSignal<boolean>) {
  flag.update((s) => (s ? false : true));
}
