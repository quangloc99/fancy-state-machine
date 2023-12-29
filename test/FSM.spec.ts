import { FSMBuilder } from '../src/index.js';

describe(FSMBuilder, () => {
    describe('simple trafic light', () => {
        const fsmBuilder = FSMBuilder.create()
            .addEvent<'next-light'>()
            .addState('red-light')
            .addState('green-light')
            .addState('yellow-light')
            .addTransition('red-light', 'next-light', 'green-light')
            .addTransition('green-light', 'next-light', 'yellow-light')
            .addTransition('yellow-light', 'next-light', 'red-light');

        it('do `next-light` 6 times', async () => {
            const fsm = fsmBuilder.build('green-light');

            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['yellow-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['red-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['green-light']);

            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['yellow-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['red-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['green-light']);
        });

        it('check return type', async () => {
            const fsm = fsmBuilder.build('green-light');
            const res = await fsm.dispatch('next-light');
            expect(res).toMatchInlineSnapshot(`
{
  "eventsFired": [
    {
      "event": [
        "next-light",
      ],
      "targetState": [
        "yellow-light",
      ],
    },
  ],
}
`);
        });
    });
});
