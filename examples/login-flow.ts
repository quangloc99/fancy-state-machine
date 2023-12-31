import { FSMBuilder } from 'fancy-state-machine';

const loginFlowFsm = FSMBuilder.create()
    .addEvent<'enter login', [{ userName: string; password: string }]>()
    .addEvent<'login fail', [reason: string]>()
    .addEvent<'login success', [userToken: string]>()
    .addEvent<'logout'>()
    .addEvent<'retry'>()

    .addState('home page')
    .addState('verifying password?', (userData: { userName: string; password: string }) => {})
    .addState('error page', (reason: string) => {})
    .addState('dashboard page', (userToken: string) => {})

    .addTransition('home page', 'enter login', 'verifying password?')
    .addTransition('verifying password?', 'login fail', 'error page', (_userData, reason) => {
        // drop userData and return the reason only
        return [reason];
    })
    .addTransition('verifying password?', 'login success', 'dashboard page', (_userData, userToken) => {
        // drop userData and return the token only
        return [userToken];
    })
    .addTransition('error page', 'retry', 'home page', () => {
        // drop everything, return to blank state
        return [];
    })
    .addTransition('dashboard page', 'logout', 'home page', () => {
        // drop everything, return to blank state
        return [];
    });

export { loginFlowFsm };
