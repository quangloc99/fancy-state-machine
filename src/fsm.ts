type KeyType = string | symbol | number;

type EmptyObject = Record<never, never>;
// eslint-disable-next-line @typescript-eslint/ban-types
type Simplify<Obj extends object> = { [key in keyof Obj]: Obj[key] } & {};
type AddProp<Obj extends object, PropName extends KeyType, Value> = Simplify<Obj & Record<PropName, Value>>;
type If<Cond extends boolean, IfTrueType, IfFalseType> = Cond extends true ? IfTrueType : IfFalseType;
type Promisable<T> = T | PromiseLike<T>;

export type EnterHandlerFunction<Params extends unknown[] = unknown[]> = (
    this: void,
    ...params: Params
) => Promisable<void>;

export type StateDataMap = Record</* StateName */ KeyType, /* Data */ unknown[]>;
export type EventDataMap = Record</* EventName */ KeyType, /* Data */ unknown[]>;

export type TransitionTable<States extends StateDataMap, Events extends EventDataMap> = {
    [SourceStateName in keyof States]: {
        enterHandler: EnterHandlerFunction<States[SourceStateName]>;
        transitions: {
            [EventName in keyof Events]?: Transition<States, Events, SourceStateName, keyof States, EventName>;
        };
    };
};

export type Transition<
    States extends StateDataMap,
    Events extends EventDataMap,
    SourceStateName extends keyof States,
    TargetStateName extends keyof States,
    EventName extends keyof Events,
> = TargetStateName extends unknown
    ? {
          target: TargetStateName;
          transitionHandler: (
              this: void,
              ...params: [...States[SourceStateName], ...Events[EventName]]
          ) => Promise<States[TargetStateName]>;
      }
    : never;

export type AnyTransitionTable = TransitionTable<StateDataMap, EventDataMap>;
export type StateDataTuple<States extends StateDataMap, StateName extends keyof States> = StateName extends unknown
    ? [StateName, ...States[StateName]]
    : never;
export type EventDataTuple<Events extends EventDataMap, EventName extends keyof Events> = EventName extends unknown
    ? [EventName, ...Events[EventName]]
    : never;
export type FSMStates<FTT extends AnyTransitionTable> = FTT extends TransitionTable<infer S, infer _E> ? S : never;
export type FSMEvents<FTT extends AnyTransitionTable> = FTT extends TransitionTable<infer _S, infer E> ? E : never;
export type AnyStateDataTuple<FTT extends AnyTransitionTable> = StateDataTuple<FSMStates<FTT>, keyof FSMStates<FTT>>;
export type AnyEventDataTuple<FTT extends AnyTransitionTable> = EventDataTuple<FSMEvents<FTT>, keyof FSMEvents<FTT>>;

export type FSMDispatchResult<FTT extends AnyTransitionTable> = {
    eventsFired: { targetState: AnyStateDataTuple<FTT>; event: AnyEventDataTuple<FTT> }[];
    interruptedEvent?: AnyEventDataTuple<FTT> | undefined;
};

export class FSM<FTT extends AnyTransitionTable> {
    constructor(
        readonly transitionTable: FTT,
        public stateData: AnyStateDataTuple<FTT>
    ) {}

    static create<FTT extends AnyTransitionTable>(
        transitionTable: FTT,
        ...initialStateData: AnyStateDataTuple<FTT>
    ): FSM<FTT> {
        return new FSM(transitionTable, initialStateData);
    }

    clone(): FSM<FTT> {
        return new FSM(this.transitionTable, this.stateData);
    }

    async dispatch(...event: AnyEventDataTuple<FTT>) {
        return this.fullDispatch(event, { ignoreInvalidTransition: false });
    }

    async dispatchIgnoreInvalidTransition(...event: AnyEventDataTuple<FTT>) {
        return this.fullDispatch(event, { ignoreInvalidTransition: true });
    }

    async fullDispatch(
        event: AnyEventDataTuple<FTT>,
        options?: {
            ignoreInvalidTransition?: boolean;
        }
    ): Promise<FSMDispatchResult<FTT>> {
        const { ignoreInvalidTransition = false } = options ?? {};
        const eventsFired: FSMDispatchResult<FTT>['eventsFired'] = [];

        const [eventName, ...eventData] = event;
        const [curStateName, ...curStateData] = this.stateData;
        const transitionData = this.transitionTable[curStateName].transitions[eventName];
        if (transitionData === undefined) {
            if (ignoreInvalidTransition) {
                // TODO additional data
                throw new Error(
                    `No transition from state ${String(this.stateData[0])} when event ${String(event[0])} is fired`
                );
            } else {
                return {
                    eventsFired,
                    interruptedEvent: event,
                };
            }
        }

        const newData = await transitionData.transitionHandler(curStateData, eventData);
        this.stateData = [transitionData.target, ...newData] as AnyStateDataTuple<FTT>;
        // TODO redirect event here.
        await this.transitionTable[this.stateData[0]].enterHandler(...newData);
        eventsFired.push({ targetState: this.stateData, event });

        return { eventsFired };
    }
}

type IsRedirectable<
    States extends StateDataMap,
    Events extends StateDataMap,
    SourceStateName extends keyof States,
    TargetStateName extends keyof States,
    EventName extends keyof Events,
> = ((...params: States[TargetStateName]) => void) extends (
    ...params: [...States[SourceStateName], ...Events[EventName]]
) => void
    ? true
    : false;

export class FSMBuilder<States extends StateDataMap, Events extends EventDataMap> {
    constructor(readonly fsm: TransitionTable<States, Events>) {}

    static create(): FSMBuilder<EmptyObject, EmptyObject> {
        return new FSMBuilder({});
    }

    addEvent<EventName extends KeyType, EventData extends unknown[] = []>(): FSMBuilder<
        States,
        AddProp<Events, EventName, EventData>
    > {
        return this as unknown as FSMBuilder<States, AddProp<Events, EventName, EventData>>;
    }

    addEvents<NewEvents extends EventDataMap>(): FSMBuilder<States, Simplify<Events & NewEvents>> {
        return this as unknown as FSMBuilder<States, Simplify<Events & NewEvents>>;
    }

    addState<const StateName extends KeyType, StateData extends unknown[]>(
        stateName: StateName,
        enterHandler: EnterHandlerFunction<StateData>
    ): FSMBuilder<AddProp<States, StateName, StateData>, Events> {
        const res = this as unknown as FSMBuilder<States & Record<StateName, StateData>, Events>;
        res.fsm[stateName] = {
            enterHandler,
            transitions: {},
        };
        return res;
    }

    addTransition<
        const SourceStateName extends keyof States,
        const EventName extends keyof Events,
        const TagetStateName extends keyof States,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TagetStateName,
        transitionHandler: Transition<States, Events, SourceStateName, TagetStateName, EventName>['transitionHandler']
    ): this;

    addTransition<
        const SourceStateName extends keyof States,
        const EventName extends keyof Events,
        const TargetStateName extends keyof States,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TargetStateName
    ): If<IsRedirectable<States, Events, SourceStateName, TargetStateName, EventName>, this, never>;

    addTransition<
        const SourceStateName extends keyof States,
        const EventName extends keyof Events,
        const TargetStateName extends keyof States,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TargetStateName,
        transitionHandler?: Transition<States, Events, SourceStateName, TargetStateName, EventName>['transitionHandler']
    ) {
        this.fsm[src].transitions[evt] = {
            target: dst,
            transitionHandler: transitionHandler ?? ((...params: unknown[]) => params),
        } as Transition<States, Events, SourceStateName, TargetStateName, EventName>;
        return this;
    }

    build() {
        return this.fsm;
    }
}
