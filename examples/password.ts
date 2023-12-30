import { FSMBuilder } from 'fancy-state-machine';

type Digit = 1 | 2 | 3 | 4;
function createSingleDigitPassword(pass: Digit) {
    return FSMBuilder.create()
        .addEvent<'digit', [d: Digit]>()
        .addEvent<'wrong'>()
        .addEvent<'correct'>()
        .addEvent<'redirect'>()

        .addState('start')
        .addState('unlocked', () => ['redirect'])
        .addState('fail', () => ['redirect'])
        .addState('verifying?', (d: Digit) => {
            return d === pass ? ['correct'] : ['wrong'];
        })
        .addTransition('start', 'digit', 'verifying?')
        .addTransition('verifying?', 'wrong', 'fail', () => [])
        .addTransition('verifying?', 'correct', 'unlocked', () => []);
}

export const passwordFSMBuilder = FSMBuilder.create()
    .embed(createSingleDigitPassword(4).scope('first-digit.'))
    .embed(createSingleDigitPassword(2).scope('second-digit.'))
    .embed(createSingleDigitPassword(1).scope('third-digit.'))
    .embed(createSingleDigitPassword(3).scope('forth-digit.'))

    .addState('start', () => ['redirect'])
    .addState('unlocked!')
    .addState('fail!')

    .addTransition('start', 'redirect', 'first-digit.start')
    .addTransition('first-digit.unlocked', 'redirect', 'second-digit.start')
    .addTransition('second-digit.unlocked', 'redirect', 'third-digit.start')
    .addTransition('third-digit.unlocked', 'redirect', 'forth-digit.start')
    .addTransition('forth-digit.unlocked', 'redirect', 'unlocked!')
    .addTransition('first-digit.fail', 'redirect', 'fail!')
    .addTransition('second-digit.fail', 'redirect', 'fail!')
    .addTransition('third-digit.fail', 'redirect', 'fail!')
    .addTransition('forth-digit.fail', 'redirect', 'fail!')
    .addTransition('fail!', 'digit', 'fail!', () => []);
