import { simpleCliFsmBuilder } from './simple-cli-app';

async function main() {
    const fsm = simpleCliFsmBuilder.build('start');

    console.log(fsm.stateData); // ['start']
    await fsm.dispatch('redirect');
    // What is your name?
    console.log(fsm.stateData); // ['pending-user-name']
    await fsm.dispatch('input', 'John');
    // Nice to meet you John! Where do you live?
    console.log(fsm.stateData); // ['pending-user-address', 'John']
    await fsm.dispatch('input', 'the moon');
    // I see. I will visit your home at the moon. See ya, John!
    console.log(fsm.stateData); // ['display-user-info', 'John', 'the moon']
}
