import { simpleTurnstileFsmBuilder } from './simple-turnstile';

async function failed() {
    const fsm = simpleTurnstileFsmBuilder.build('locked');
    await fsm.dispatch('push'); // this throw error
}

async function pass() {
    const fsm = simpleTurnstileFsmBuilder.build('locked').setOptions({ ignoreInvalidTransition: true });

    await fsm.dispatch('push');
    console.log(fsm.stateData); // ['locked']
    await fsm.dispatch('coin');
    console.log(fsm.stateData); // ['unlocked']
    await fsm.dispatch('coin');
    console.log(fsm.stateData); // ['unlocked']
    await fsm.dispatch('push');
    console.log(fsm.stateData); // ['locked']
    await fsm.dispatch('push');
    console.log(fsm.stateData); // ['locked']
}
