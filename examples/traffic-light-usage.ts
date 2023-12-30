import { trafficLightFsmBuilder } from './traffic-light';

async function main() {
    const fsm = trafficLightFsmBuilder.build('green-light'); // pass in initial state

    console.log(fsm.stateData); // ['green-light']
    await fsm.dispatch('next-light');
    console.log(fsm.stateData); // ['yellow-light']
    await fsm.dispatch('next-light');
    console.log(fsm.stateData); // ['red-light']
    await fsm.dispatch('next-light');
    console.log(fsm.stateData); // ['green-light']
}
