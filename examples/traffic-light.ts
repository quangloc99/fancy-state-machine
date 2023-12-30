import { FSMBuilder } from 'fancy-state-machine';

const trafficLightFsmBuilder = FSMBuilder.create()
    .addEvent<'next-light'>()

    .addState('red-light')
    .addState('green-light')
    .addState('yellow-light')

    //             fromState       event       targetState
    .addTransition('red-light', 'next-light', 'green-light')
    .addTransition('green-light', 'next-light', 'yellow-light')
    .addTransition('yellow-light', 'next-light', 'red-light');

export { trafficLightFsmBuilder };
