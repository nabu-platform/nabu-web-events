@title Testing
@tags test

Web event enrichment via specs:
- 3 new specs (connect, disconnect & message event)
- web events will run through all implementations on those hooks
- implementations of message must be able to "halt" events from being fired, this allows the frontend to trigger some action in the backend that does not end up in the event stream

We can use this to for example enrich events with geo location data from ipstack
We can use this to perform session recording. We can push all events to a central storage and on disconnect, send out a single event with the entire session in it