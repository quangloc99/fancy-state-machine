import { FSMBuilder } from 'fancy-state-machine';

const loginFlowFsm = FSMBuilder.create()
    .addEvent<'enter login'>()
    .addEvent<'login fail'>()
    .addEvent<'login success'>()
    .addEvent<'logout'>()
    .addEvent<'retry'>()

    .addState('home page')
    .addState('verifying password?')
    .addState('error page')
    .addState('dashboard page')

    .addTransition('home page', 'enter login', 'verifying password?')
    .addTransition('verifying password?', 'login fail', 'error page')
    .addTransition('verifying password?', 'login success', 'dashboard page')
    .addTransition('error page', 'retry', 'home page')
    .addTransition('dashboard page', 'logout', 'home page');

export { loginFlowFsm };
