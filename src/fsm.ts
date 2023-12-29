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
export type StateDataTuple<
    States extends StateDataMap,
    StateName extends keyof States = keyof States,
> = StateName extends unknown ? [StateName, ...States[StateName]] : never;
export type EventDataTuple<
    Events extends EventDataMap,
    EventName extends keyof Events = keyof Events,
> = EventName extends unknown ? [EventName, ...Events[EventName]] : never;

export type FSMDispatchResult<S extends StateDataMap, E extends EventDataMap> = {
    eventsFired: {
        targetState: StateDataTuple<S>;
        event: EventDataTuple<E>;
    }[];
    interruptedEvent?: EventDataTuple<E> | undefined;
};

export class FSM<S extends StateDataMap, E extends EventDataMap> {
    constructor(
        readonly transitionTable: TransitionTable<S, E>,
        public stateData: StateDataTuple<S>
    ) {}

    static create<S extends StateDataMap, E extends EventDataMap>(
        transitionTable: TransitionTable<S, E>,
        ...initialStateData: StateDataTuple<S>
    ): FSM<S, E> {
        return new FSM(transitionTable, initialStateData);
    }

    clone(): FSM<S, E> {
        return new FSM(this.transitionTable, this.stateData);
    }

    async dispatch(...event: EventDataTuple<E>) {
        return this.fullDispatch(event, { ignoreInvalidTransition: false });
    }

    async dispatchIgnoreInvalidTransition(...event: EventDataTuple<E>) {
        return this.fullDispatch(event, { ignoreInvalidTransition: true });
    }

    async fullDispatch(
        event: EventDataTuple<E>,
        options?: {
            ignoreInvalidTransition?: boolean;
        }
    ): Promise<FSMDispatchResult<S, E>> {
        const { ignoreInvalidTransition = false } = options ?? {};
        const eventsFired: FSMDispatchResult<S, E>['eventsFired'] = [];

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
        this.stateData = [transitionData.target, ...newData] as StateDataTuple<S>;
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

export class FSMBuilder<S extends StateDataMap, E extends EventDataMap> {
    constructor(readonly transitionTable: TransitionTable<S, E>) {}

    static create(): FSMBuilder<EmptyObject, EmptyObject> {
        return new FSMBuilder({});
    }

    addEvent<EventName extends KeyType, EventData extends unknown[] = []>(): FSMBuilder<
        S,
        AddProp<E, EventName, EventData>
    > {
        return this as unknown as FSMBuilder<S, AddProp<E, EventName, EventData>>;
    }

    addEvents<NewEvents extends EventDataMap>(): FSMBuilder<S, Simplify<E & NewEvents>> {
        return this as unknown as FSMBuilder<S, Simplify<E & NewEvents>>;
    }

    addState<const StateName extends KeyType, StateData extends unknown[]>(
        stateName: StateName,
        enterHandler: EnterHandlerFunction<StateData>
    ): FSMBuilder<AddProp<S, StateName, StateData>, E> {
        const res = this as unknown as FSMBuilder<S & Record<StateName, StateData>, E>;
        res.transitionTable[stateName] = {
            enterHandler,
            transitions: {},
        };
        return res;
    }

    addTransition<
        const SourceStateName extends keyof S,
        const EventName extends keyof E,
        const TagetStateName extends keyof S,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TagetStateName,
        transitionHandler: Transition<S, E, SourceStateName, TagetStateName, EventName>['transitionHandler']
    ): this;

    addTransition<
        const SourceStateName extends keyof S,
        const EventName extends keyof E,
        const TargetStateName extends keyof S,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TargetStateName
    ): If<IsRedirectable<S, E, SourceStateName, TargetStateName, EventName>, this, never>;

    addTransition<
        const SourceStateName extends keyof S,
        const EventName extends keyof E,
        const TargetStateName extends keyof S,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TargetStateName,
        transitionHandler?: Transition<S, E, SourceStateName, TargetStateName, EventName>['transitionHandler']
    ) {
        this.transitionTable[src].transitions[evt] = {
            target: dst,
            transitionHandler: transitionHandler ?? ((...params: unknown[]) => params),
        } as Transition<S, E, SourceStateName, TargetStateName, EventName>;
        return this;
    }

    build(...initialStateData: StateDataTuple<S>): FSM<S, E> {
        return FSM.create(this.transitionTable, ...initialStateData);
    }
}
