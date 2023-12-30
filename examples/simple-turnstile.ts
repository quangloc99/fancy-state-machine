import { FSMBuilder } from 'fancy-state-machine';

export const simpleTurnstileFsmBuilder = FSMBuilder.create()
    .addEvents<{
        coin: [];
        push: [];
    }>()

    .addState('locked')
    .addState('unlocked')

    .addTransition('locked', 'coin', 'unlocked')
    .addTransition('unlocked', 'push', 'locked');
