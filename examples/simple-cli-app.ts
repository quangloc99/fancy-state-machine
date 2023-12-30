import { FSMBuilder } from 'fancy-state-machine';

export const simpleCliFsmBuilder = FSMBuilder.create()
    .addEvent<'input', [line: string]>()
    .addEvent<'redirect'>()

    .addState('start')
    .addState('pending-user-name', () => {
        console.log('What is your name?');
    })
    .addState('pending-user-address', async (userName: string) => {
        console.log(`Nice to meet you, ${userName}! Where do you live?`);
    })
    .addState('display-user-info', (userName: string, address: string) => {
        console.log(`I see. I will visit your home at ${address}. See ya, ${userName}!`);
    })

    .addTransition('start', 'redirect', 'pending-user-name')
    .addTransition('pending-user-name', 'input', 'pending-user-address')
    .addTransition('pending-user-address', 'input', 'display-user-info');
